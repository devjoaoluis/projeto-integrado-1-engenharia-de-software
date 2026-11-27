import { GlobalFinancialSettings } from "../../domain/entities/FinancialSettings";
import {
  GlobalFinancialSettingsUpdate,
  IFinancialRepository,
} from "../../domain/repositories/IFinancialRepository";

export class UpdateFinancialSettings {
  constructor(private financialRepository: IFinancialRepository) {}

  async execute(input: GlobalFinancialSettingsUpdate): Promise<GlobalFinancialSettings> {
    if (!input || typeof input !== "object") throw new Error("Informe as regras financeiras.");
    if (!Number.isSafeInteger(input.graceDays) || input.graceDays < 0 || input.graceDays > 3650) {
      throw new Error("A carência deve ser um número inteiro entre 0 e 3650 dias.");
    }
    for (const [label, value] of [
      ["multa", input.fineRateBasisPoints],
      ["juros", input.monthlyInterestBasisPoints],
      ["taxa de administração", input.adminFeeBasisPoints],
    ] as const) {
      if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
        throw new Error(`A taxa de ${label} deve estar entre 0% e 100%.`);
      }
    }
    return this.financialRepository.updateGlobalSettings(input);
  }
}
