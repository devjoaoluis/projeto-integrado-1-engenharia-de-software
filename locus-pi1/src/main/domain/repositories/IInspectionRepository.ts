import { Inspection, InspectionDetails, InspectionMedia } from "../entities/Inspection";

export interface IInspectionRepository {
  create(inspection: Inspection, media: InspectionMedia[]): Promise<InspectionDetails>;
  findById(id: string): Promise<InspectionDetails | null>;
  findByPropertyId(propertyId: string): Promise<Inspection[]>;
  findByContractId(contractId: string): Promise<Inspection[]>;
}
