import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export interface UpdateRentalPrerequisitesDTO {
  id: string;
  contractSigned: boolean;
  signaturesNotarized: boolean;
  initialPaymentsPaid: boolean;
}

export class UpdateRentalPrerequisites {
  constructor(private rentalRepository: IRentalRepository) {}

  async execute(dto: UpdateRentalPrerequisitesDTO) {
    if (!dto || typeof dto.id !== "string" || !dto.id.trim() ||
        [dto.contractSigned, dto.signaturesNotarized, dto.initialPaymentsPaid].some(value => typeof value !== "boolean")) {
      throw new Error("Rental id and boolean prerequisites are required");
    }
    const rental = await this.rentalRepository.findById(dto.id);
    if (!rental) throw new Error(`Rental with id ${dto.id} not found`);
    if (rental.keysReleasedAt !== null) throw new Error("Prerequisites cannot be changed after keys are released");
    return this.rentalRepository.updatePrerequisites(dto.id, {
      contractSigned: dto.contractSigned,
      signaturesNotarized: dto.signaturesNotarized,
      initialPaymentsPaid: dto.initialPaymentsPaid,
    });
  }
}
