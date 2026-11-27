import { ContractFinancialSettings } from "../../domain/entities/FinancialSettings";
import {
  ContractFinancialSettingsUpdate,
  IFinancialRepository,
} from "../../domain/repositories/IFinancialRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export class UpdateContractFinancialSettings {
  constructor(
    private financialRepository: IFinancialRepository,
    private historyRepository: IPropertyHistoryRepository,
  ) {}

  async execute(
    contractId: string,
    input: ContractFinancialSettingsUpdate,
  ): Promise<ContractFinancialSettings> {
    if (typeof contractId !== "string" || !contractId.trim()) {
      throw new Error("Selecione um contrato.");
    }
    if (!input || typeof input !== "object") throw new Error("Informe as regras do contrato.");
    if (!Number.isSafeInteger(input.graceDays) || input.graceDays < 0 || input.graceDays > 3650) {
      throw new Error("A carência deve ser um número inteiro entre 0 e 3650 dias.");
    }
    for (const [label, value] of [
      ["multa", input.fineRateBasisPoints],
      ["juros", input.monthlyInterestBasisPoints],
    ] as const) {
      if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
        throw new Error(`A taxa de ${label} deve estar entre 0% e 100%.`);
      }
    }
    if (typeof input.useOwnRules !== "boolean") {
      throw new Error("Informe se o contrato usará regras próprias.");
    }
    if (!(await this.historyRepository.findContractById(contractId.trim()))) {
      throw new Error("Contrato não encontrado.");
    }
    return this.financialRepository.updateContractSettings(contractId.trim(), input);
  }
}
