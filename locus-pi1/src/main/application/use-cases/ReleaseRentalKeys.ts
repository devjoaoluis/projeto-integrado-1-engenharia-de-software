import { Rental } from "../../domain/entities/Rental";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export class ReleaseRentalKeys {
  constructor(private rentalRepository: IRentalRepository) {}

  async execute(id: string): Promise<Rental> {
    const rental = await this.rentalRepository.findById(id);
    if (!rental) throw new Error(`Rental with id ${id} not found`);
    if (!rental.contractSigned || !rental.signaturesNotarized || !rental.initialPaymentsPaid) {
      throw new Error("RN01: Signed contract, notarized signatures and initial payments are required to release keys");
    }
    if (rental.keysReleasedAt !== null) return rental;
    return this.rentalRepository.releaseKeys(id, Date.now());
  }
}
