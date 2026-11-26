import { Visit, VisitStatus, VisitWithDetails } from "../entities/Visit";

export interface VisitFilter {
  propertyId?: string;
  clientId?: string;
  status?: VisitStatus;
  fromTimestamp?: number;
  toTimestamp?: number;
}

export interface IVisitRepository {
  create(visit: Visit): Promise<Visit>;
  findById(id: string): Promise<Visit | null>;
  findWithDetailsById(id: string): Promise<VisitWithDetails | null>;
  findAll(filter?: VisitFilter): Promise<VisitWithDetails[]>;
  findByPropertyId(propertyId: string): Promise<VisitWithDetails[]>;
  findByClientId(clientId: string): Promise<VisitWithDetails[]>;
  findUpcoming(limit?: number, nowTimestamp?: number): Promise<VisitWithDetails[]>;
  update(visit: Visit): Promise<Visit>;
  delete(id: string): Promise<void>;
}
