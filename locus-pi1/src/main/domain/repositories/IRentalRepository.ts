import { Rental } from "../entities/Rental";

export interface IRentalRepository {
  // Persist the association and property status atomically.
  create(rental: Rental): Promise<Rental>;
  findById(id: string): Promise<Rental | null>;
  findByPropertyId(propertyId: string): Promise<Rental[]>;
  findAll(): Promise<Rental[]>;
  updatePrerequisites(id: string, prerequisites: Pick<Rental, "contractSigned" | "signaturesNotarized" | "initialPaymentsPaid">): Promise<Rental>;
  releaseKeys(id: string, releasedAt: number): Promise<Rental>;
  cancel?(id: string, cancelledAt: number): Promise<void>;
}
