import { IFinancialRepository } from "../../domain/repositories/IFinancialRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export class VoidInstallmentItem {
  constructor(
    private financialRepository: IFinancialRepository,
    private historyRepository: IPropertyHistoryRepository,
  ) {}

  async execute(id: string, voidedBy?: string | null): Promise<void> {
    if (typeof id !== "string" || !id.trim()) throw new Error("Selecione o lançamento que deseja cancelar.");
    const item = await this.financialRepository.findInstallmentItemById(id.trim());
    if (!item || item.voidedAt != null) {
      throw new Error("O lançamento mensal não foi encontrado ou já foi cancelado.");
    }
    const history = await this.historyRepository.findByPropertyId(item.propertyId);
    if (history.payments.some((payment) =>
      payment.contractId === item.contractId
      && payment.referenceMonth === item.referenceMonth
      && payment.reversedAt == null
    )) {
      throw new Error("Não é possível cancelar a despesa depois de receber qualquer valor da competência.");
    }
    await this.financialRepository.voidInstallmentItem(id.trim(), Date.now(), voidedBy ?? null);
  }
}
