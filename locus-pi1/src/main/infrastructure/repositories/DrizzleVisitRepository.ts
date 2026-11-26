import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../database/db";
import { propertyVisits } from "../database/schema/property-visits";
import { properties } from "../database/schema/properties";
import { clients } from "../database/schema/clients";
import { Visit, VisitWithDetails } from "../../domain/entities/Visit";
import { IVisitRepository, VisitFilter } from "../../domain/repositories/IVisitRepository";

export class DrizzleVisitRepository implements IVisitRepository {
  async create(visit: Visit): Promise<Visit> {
    await db.insert(propertyVisits).values({
      id: visit.id,
      propertyId: visit.propertyId,
      clientId: visit.clientId,
      scheduledAt: visit.scheduledAt,
      status: visit.status,
      notes: visit.notes,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
    });
    return visit;
  }

  async findById(id: string): Promise<Visit | null> {
    const result = await db
      .select()
      .from(propertyVisits)
      .where(eq(propertyVisits.id, id))
      .get();
    return result ? (result as Visit) : null;
  }

  async findWithDetailsById(id: string): Promise<VisitWithDetails | null> {
    const result = await db
      .select({
        id: propertyVisits.id,
        propertyId: propertyVisits.propertyId,
        clientId: propertyVisits.clientId,
        scheduledAt: propertyVisits.scheduledAt,
        status: propertyVisits.status,
        notes: propertyVisits.notes,
        createdAt: propertyVisits.createdAt,
        updatedAt: propertyVisits.updatedAt,
        propertyTitle: properties.title,
        propertyAddress: properties.address,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
      })
      .from(propertyVisits)
      .innerJoin(properties, eq(propertyVisits.propertyId, properties.id))
      .innerJoin(clients, eq(propertyVisits.clientId, clients.id))
      .where(eq(propertyVisits.id, id))
      .get();

    return result ? (result as VisitWithDetails) : null;
  }

  async findAll(filter?: VisitFilter): Promise<VisitWithDetails[]> {
    const conditions = [];

    if (filter?.propertyId) {
      conditions.push(eq(propertyVisits.propertyId, filter.propertyId));
    }
    if (filter?.clientId) {
      conditions.push(eq(propertyVisits.clientId, filter.clientId));
    }
    if (filter?.status) {
      conditions.push(eq(propertyVisits.status, filter.status));
    }
    if (filter?.fromTimestamp !== undefined) {
      conditions.push(gte(propertyVisits.scheduledAt, filter.fromTimestamp));
    }
    if (filter?.toTimestamp !== undefined) {
      conditions.push(lte(propertyVisits.scheduledAt, filter.toTimestamp));
    }

    const query = db
      .select({
        id: propertyVisits.id,
        propertyId: propertyVisits.propertyId,
        clientId: propertyVisits.clientId,
        scheduledAt: propertyVisits.scheduledAt,
        status: propertyVisits.status,
        notes: propertyVisits.notes,
        createdAt: propertyVisits.createdAt,
        updatedAt: propertyVisits.updatedAt,
        propertyTitle: properties.title,
        propertyAddress: properties.address,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
      })
      .from(propertyVisits)
      .innerJoin(properties, eq(propertyVisits.propertyId, properties.id))
      .innerJoin(clients, eq(propertyVisits.clientId, clients.id));

    if (conditions.length > 0) {
      return (await query
        .where(and(...conditions))
        .orderBy(asc(propertyVisits.scheduledAt))) as VisitWithDetails[];
    }

    return (await query.orderBy(asc(propertyVisits.scheduledAt))) as VisitWithDetails[];
  }

  async findByPropertyId(propertyId: string): Promise<VisitWithDetails[]> {
    return this.findAll({ propertyId });
  }

  async findByClientId(clientId: string): Promise<VisitWithDetails[]> {
    return this.findAll({ clientId });
  }

  async findUpcoming(limit = 10, nowTimestamp = Date.now()): Promise<VisitWithDetails[]> {
    const results = await db
      .select({
        id: propertyVisits.id,
        propertyId: propertyVisits.propertyId,
        clientId: propertyVisits.clientId,
        scheduledAt: propertyVisits.scheduledAt,
        status: propertyVisits.status,
        notes: propertyVisits.notes,
        createdAt: propertyVisits.createdAt,
        updatedAt: propertyVisits.updatedAt,
        propertyTitle: properties.title,
        propertyAddress: properties.address,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
      })
      .from(propertyVisits)
      .innerJoin(properties, eq(propertyVisits.propertyId, properties.id))
      .innerJoin(clients, eq(propertyVisits.clientId, clients.id))
      .where(
        and(
          eq(propertyVisits.status, "AGENDADA"),
          gte(propertyVisits.scheduledAt, nowTimestamp)
        )
      )
      .orderBy(asc(propertyVisits.scheduledAt))
      .limit(limit);

    return results as VisitWithDetails[];
  }

  async update(visit: Visit): Promise<Visit> {
    const updated = await db
      .update(propertyVisits)
      .set({
        propertyId: visit.propertyId,
        clientId: visit.clientId,
        scheduledAt: visit.scheduledAt,
        status: visit.status,
        notes: visit.notes,
        updatedAt: visit.updatedAt,
      })
      .where(eq(propertyVisits.id, visit.id))
      .returning()
      .get();

    if (!updated) {
      throw new Error("Agendamento de visita não encontrado para atualização.");
    }

    return updated as Visit;
  }

  async delete(id: string): Promise<void> {
    await db.delete(propertyVisits).where(eq(propertyVisits.id, id)).run();
  }
}
