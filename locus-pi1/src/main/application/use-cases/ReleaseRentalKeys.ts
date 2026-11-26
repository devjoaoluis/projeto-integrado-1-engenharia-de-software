import { Rental } from "../../domain/entities/Rental";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export class ReleaseRentalKeys {
  constructor(
    private rentalRepository: IRentalRepository,
    private inspectionRepository?: IInspectionRepository,
    private historyRepository?: IPropertyHistoryRepository,
  ) {}

  async execute(id: string): Promise<Rental> {
    const rental = await this.rentalRepository.findById(id);
    if (!rental) throw new Error(`Rental with id ${id} not found`);
    if (!rental.contractSigned || !rental.signaturesNotarized || !rental.initialPaymentsPaid) {
      throw new Error("RN01: Signed contract, notarized signatures and initial payments are required to release keys");
    }

    if (this.inspectionRepository) {
      let contractId: string | null = null;
      if (this.historyRepository) {
        const history = await this.historyRepository.findByPropertyId(rental.propertyId);
        const contract = history.contracts.find((c) => c.rentalId === rental.id);
        if (contract) contractId = contract.id;
      }
      const inspections = contractId
        ? await this.inspectionRepository.findByContractId(contractId)
        : await this.inspectionRepository.findByPropertyId(rental.propertyId);
      const hasEntry = inspections.some((i) => i.type === "ENTRY" && (!contractId || i.contractId === contractId));
      if (!hasEntry) {
        throw new Error("RN03: A vistoria de entrada é obrigatória para a entrega das chaves.");
      }
    }

    if (rental.keysReleasedAt !== null) return rental;
    return this.rentalRepository.releaseKeys(id, Date.now());
  }
}
