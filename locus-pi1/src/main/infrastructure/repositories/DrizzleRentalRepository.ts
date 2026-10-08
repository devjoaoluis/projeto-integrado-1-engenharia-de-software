import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../database/db";
import { rentals } from "../database/schema/rentals";
import { propertyContracts } from "../database/schema/property-history";
import { properties } from "../database/schema/properties";
import { Rental } from "../../domain/entities/Rental";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export class DrizzleRentalRepository implements IRentalRepository {
  async create(rental: Rental): Promise<Rental> {
    return db.transaction(async (tx) => {
      if (rental.parentRentalId) {
        const parent = await tx.select().from(rentals).where(eq(rentals.id, rental.parentRentalId)).get();
        if (!parent || parent.propertyId !== rental.propertyId || parent.parentRentalId !== null ||
            parent.tenantId === rental.tenantId || !rental.formalConsent?.trim()) {
          throw new Error("RN02: Invalid subletting or missing formal consent");
        }
      }
      const result = await tx.update(properties).set({ status: "ALUGADO", updatedAt: rental.updatedAt })
        .where(and(eq(properties.id, rental.propertyId), inArray(properties.status,
          rental.parentRentalId ? ["ALUGADO"] : ["CADASTRADO", "DISPONIVEL"]))).run();
      if (result.rowsAffected !== 1) throw new Error("Property is not available for this rental");
      await tx.insert(rentals).values(rental).run();
      await tx.insert(propertyContracts).values({
        id: randomUUID(), propertyId: rental.propertyId, tenantId: rental.tenantId, rentalId: rental.id,
        reference: `LOC-${rental.id}`, monthlyRent: rental.monthlyRent, startDate: rental.startDate,
        endDate: null, status: "ACTIVE", createdAt: rental.createdAt,
      }).run();
      return rental;
    });
  }

  async findById(id: string): Promise<Rental | null> {
    return (await db.select().from(rentals).where(eq(rentals.id, id)).get()) ?? null;
  }

  async findByPropertyId(propertyId: string): Promise<Rental[]> {
    return db.select().from(rentals).where(eq(rentals.propertyId, propertyId)).all();
  }

  async findAll(): Promise<Rental[]> {
    return db.select().from(rentals).orderBy(rentals.createdAt).all();
  }

  async updatePrerequisites(id: string, prerequisites: Pick<Rental, "contractSigned" | "signaturesNotarized" | "initialPaymentsPaid">): Promise<Rental> {
    const result = await db.update(rentals).set({ ...prerequisites, updatedAt: Date.now() })
      .where(and(eq(rentals.id, id), isNull(rentals.keysReleasedAt))).returning().get();
    if (!result) throw new Error("Rental not found or keys already released");
    return result;
  }

  async releaseKeys(id: string, releasedAt: number): Promise<Rental> {
    return db.transaction(async (tx) => {
      const rental = await tx.select().from(rentals).where(eq(rentals.id, id)).get();
      if (!rental) throw new Error(`Rental with id ${id} not found`);
      if (!rental.contractSigned || !rental.signaturesNotarized || !rental.initialPaymentsPaid) {
        throw new Error("RN01: Rental prerequisites are required to release keys");
      }
      if (rental.keysReleasedAt !== null) return rental;
      return tx.update(rentals).set({ keysReleasedAt: releasedAt, updatedAt: releasedAt })
        .where(eq(rentals.id, id)).returning().get();
    });
  }

  async cancel(id: string, cancelledAt: number): Promise<void> {
    await db.transaction(async (tx) => {
      const rental = await tx.select().from(rentals).where(eq(rentals.id, id)).get();
      if (!rental) throw new Error(`Rental with id ${id} not found`);
      const children = await tx.select({ id: rentals.id }).from(rentals).where(eq(rentals.parentRentalId, id)).limit(1);
      if (children.length) throw new Error("Encerre as sublocações antes de encerrar a locação principal.");
      const contracts = await tx.select().from(propertyContracts).where(eq(propertyContracts.rentalId, id));
      if (!contracts.length) {
        await tx.insert(propertyContracts).values({
          id: randomUUID(), propertyId: rental.propertyId, tenantId: rental.tenantId, rentalId: null,
          reference: `LOC-${rental.id}`, monthlyRent: rental.monthlyRent, startDate: rental.startDate,
          endDate: cancelledAt > rental.startDate ? cancelledAt : null,
          status: cancelledAt > rental.startDate ? "ENDED" : "CANCELLED", createdAt: rental.createdAt,
        }).run();
      }
      for (const contract of contracts) {
        await tx.update(propertyContracts).set({ rentalId: null,
          status: contract.status === "ACTIVE" ? (cancelledAt > contract.startDate ? "ENDED" : "CANCELLED") : contract.status,
          endDate: contract.status === "ACTIVE" ? (cancelledAt > contract.startDate ? cancelledAt : null) : contract.endDate,
        }).where(eq(propertyContracts.id, contract.id)).run();
      }
      if (rental.parentRentalId === null) {
        await tx.update(properties).set({ status: "DISPONIVEL", updatedAt: cancelledAt })
          .where(eq(properties.id, rental.propertyId)).run();
      }
      await tx.delete(rentals).where(eq(rentals.id, id)).run();
    });
  }
}
