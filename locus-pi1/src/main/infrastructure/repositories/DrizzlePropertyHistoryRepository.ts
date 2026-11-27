import { desc, eq } from "drizzle-orm";
import { db } from "../database/db";
import { propertyContracts, propertyPayments, propertyInspections, propertyMaintenances } from "../database/schema/property-history";
import { PropertyContract, PropertyHistory, PropertyPayment, PropertyInspection, PropertyMaintenance } from "../../domain/entities/PropertyHistory";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export class DrizzlePropertyHistoryRepository implements IPropertyHistoryRepository {
  async findByPropertyId(propertyId: string): Promise<PropertyHistory> {
    return db.transaction(async (tx) => ({
      contracts: await tx.select().from(propertyContracts).where(eq(propertyContracts.propertyId, propertyId)).orderBy(desc(propertyContracts.startDate), desc(propertyContracts.createdAt), desc(propertyContracts.id)),
      payments: await tx.select().from(propertyPayments).where(eq(propertyPayments.propertyId, propertyId)).orderBy(desc(propertyPayments.paidAt), desc(propertyPayments.createdAt), desc(propertyPayments.id)),
      inspections: await tx.select().from(propertyInspections).where(eq(propertyInspections.propertyId, propertyId)).orderBy(desc(propertyInspections.inspectedAt), desc(propertyInspections.createdAt), desc(propertyInspections.id)),
      maintenances: await tx.select().from(propertyMaintenances).where(eq(propertyMaintenances.propertyId, propertyId)).orderBy(desc(propertyMaintenances.performedAt), desc(propertyMaintenances.createdAt), desc(propertyMaintenances.id)),
    }));
  }

  async findContractById(id: string): Promise<PropertyContract | null> {
    return (await db.select().from(propertyContracts).where(eq(propertyContracts.id, id)).get()) ?? null;
  }

  async findPaymentById(id: string): Promise<PropertyPayment | null> {
    return (await db.select().from(propertyPayments).where(eq(propertyPayments.id, id)).get()) ?? null;
  }

  async findAllContracts(): Promise<PropertyContract[]> {
  return db
    .select()
    .from(propertyContracts)
    .orderBy(
      desc(propertyContracts.createdAt),
      desc(propertyContracts.id)
    )
    .all();
}

  async findContractsByTenantId(tenantId: string): Promise<PropertyContract[]> {
    return db.select().from(propertyContracts).where(eq(propertyContracts.tenantId, tenantId)).orderBy(desc(propertyContracts.startDate), desc(propertyContracts.createdAt)).all();
  }

  async updateContractDates(contractId: string, dates: { startDate?: number; endDate?: number | null }): Promise<PropertyContract> {
    const updateData: Record<string, any> = {};
    if (dates.startDate !== undefined) updateData.startDate = dates.startDate;
    if (dates.endDate !== undefined) updateData.endDate = dates.endDate;
    const result = await db.update(propertyContracts).set(updateData).where(eq(propertyContracts.id, contractId)).returning().get();
    if (!result) throw new Error(`Contract with id ${contractId} not found`);
    return result;
  }

  async createContract(contract: PropertyContract): Promise<PropertyContract> {
    await db.insert(propertyContracts).values(contract);
    return contract;
  }

  async createPayment(payment: PropertyPayment): Promise<PropertyPayment> {
    await db.insert(propertyPayments).values(payment);
    return payment;
  }

  async createInspection(inspection: PropertyInspection): Promise<PropertyInspection> {
    await db.insert(propertyInspections).values(inspection);
    return inspection;
  }

  async createMaintenance(maintenance: PropertyMaintenance): Promise<PropertyMaintenance> {
    await db.insert(propertyMaintenances).values(maintenance);
    return maintenance;
  }
}
