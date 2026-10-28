import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export class CancelRental {
  constructor(
    private rentalRepository: IRentalRepository,
    private inspectionRepository?: IInspectionRepository,
    private historyRepository?: IPropertyHistoryRepository,
  ) {}

  async execute(id: string): Promise<void> {
    if (typeof id !== "string" || !id.trim()) throw new Error("Rental id is required");
    if (!this.rentalRepository.cancel) throw new Error("Rental cancellation is not supported");

    if (this.inspectionRepository) {
      const rental = await this.rentalRepository.findById(id);
      if (!rental) throw new Error(`Rental with id ${id} not found`);

      // RN03: Se as chaves foram entregues, a vistoria de saída é obrigatória para encerrar a locação
      if (rental.keysReleasedAt !== null) {
        let contractId: string | null = null;
        if (this.historyRepository) {
          const history = await this.historyRepository.findByPropertyId(rental.propertyId);
          const contract = history.contracts.find((c) => c.rentalId === rental.id);
          if (contract) contractId = contract.id;
        }
        const inspections = contractId
          ? await this.inspectionRepository.findByContractId(contractId)
          : await this.inspectionRepository.findByPropertyId(rental.propertyId);
        const hasExit = inspections.some((i) => i.type === "EXIT" && (!contractId || i.contractId === contractId));
        if (!hasExit) {
          throw new Error("RN03: A vistoria de saída é obrigatória para o encerramento da locação.");
        }
      }
    }

    await this.rentalRepository.cancel(id, Date.now());
  }
}
