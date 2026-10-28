import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../database/db";
import { propertyInspections } from "../database/schema/property-history";
import { inspectionMedia } from "../database/schema/inspection-media";
import { Inspection, InspectionDetails, InspectionMedia } from "../../domain/entities/Inspection";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";

export class DrizzleInspectionRepository implements IInspectionRepository {
  async create(inspection: Inspection, media: InspectionMedia[]): Promise<InspectionDetails> {
    return db.transaction(async tx => {
      await tx.insert(propertyInspections).values(inspection);
      if (media.length) await tx.insert(inspectionMedia).values(media);
      return { ...inspection, media };
    });
  }

  async findById(id: string): Promise<InspectionDetails | null> {
    return db.transaction(async tx => {
      const inspection = await tx.select().from(propertyInspections).where(and(
        eq(propertyInspections.id, id), isNotNull(propertyInspections.contractId), isNotNull(propertyInspections.type),
      )).get();
      if (!inspection) return null;
      const media = await tx.select().from(inspectionMedia).where(eq(inspectionMedia.inspectionId, id)).orderBy(inspectionMedia.createdAt, inspectionMedia.id);
      return { ...inspection, media } as InspectionDetails;
    });
  }

  async findByPropertyId(propertyId: string): Promise<Inspection[]> {
    return db.select().from(propertyInspections).where(and(eq(propertyInspections.propertyId, propertyId),
      isNotNull(propertyInspections.contractId), isNotNull(propertyInspections.type)))
      .orderBy(desc(propertyInspections.inspectedAt), desc(propertyInspections.id)) as Promise<Inspection[]>;
  }

  async findByContractId(contractId: string): Promise<Inspection[]> {
    return db.select().from(propertyInspections).where(and(eq(propertyInspections.contractId, contractId), isNotNull(propertyInspections.type)))
      .orderBy(desc(propertyInspections.inspectedAt), desc(propertyInspections.id)) as Promise<Inspection[]>;
  }
}
