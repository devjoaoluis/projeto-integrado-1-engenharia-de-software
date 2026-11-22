import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { PropertyContract } from "../../domain/entities/PropertyHistory";
import { parseContractDate } from "./AssembleContractData";

export interface UpdateContractDatesInput {
  propertyId?: string;
  contractId?: string;
  rentalId?: string;
  tenantId?: string;
  startDate?: number | string;
  endDate?: number | string | null;
}

/**
 * Caso de uso: Atualizar as datas de vigência (Data de Início e Data de Término) de um contrato.
 * Valida consistência temporal (Data de Fim posterior à Data de Início).
 */
export class UpdateContractDates {
  constructor(
    private historyRepository: IPropertyHistoryRepository,
    private rentalRepository?: IRentalRepository,
  ) {}

  async execute(input: UpdateContractDatesInput): Promise<PropertyContract> {
    if (!input.contractId && !input.propertyId && !input.rentalId) {
      throw new Error("Pelo menos um identificador (contractId, propertyId ou rentalId) deve ser informado.");
    }

    let contract: PropertyContract | null = null;
    if (input.contractId) {
      contract = await this.historyRepository.findContractById(input.contractId);
    }

    if (!contract && input.propertyId) {
      const history = await this.historyRepository.findByPropertyId(input.propertyId);
      contract =
        history.contracts.find((c) =>
          (input.rentalId ? c.rentalId === input.rentalId : false) ||
          (input.tenantId ? c.tenantId === input.tenantId : false) ||
          c.status === "ACTIVE"
        ) ?? null;
    }

    if (!contract) {
      throw new Error("Contrato não encontrado para atualização das datas de vigência.");
    }

    const currentStartDate = contract.startDate;
    const currentEndDate = contract.endDate;

    const newStartDate =
      input.startDate !== undefined ? parseContractDate(input.startDate) : currentStartDate;
    const newEndDate =
      input.endDate !== undefined ? parseContractDate(input.endDate) : currentEndDate;

    if (newStartDate === null) {
      throw new Error("A data de início do contrato não pode ser nula ou inválida.");
    }

    if (newEndDate !== null && newEndDate <= newStartDate) {
      throw new Error("A data de término do contrato deve ser posterior à data de início.");
    }

    let updatedContract: PropertyContract;
    if (typeof this.historyRepository.updateContractDates === "function") {
      updatedContract = await this.historyRepository.updateContractDates(contract.id, {
        startDate: newStartDate,
        endDate: newEndDate,
      });
    } else {
      contract.startDate = newStartDate;
      contract.endDate = newEndDate;
      updatedContract = contract;
    }

    return updatedContract;
  }
}
