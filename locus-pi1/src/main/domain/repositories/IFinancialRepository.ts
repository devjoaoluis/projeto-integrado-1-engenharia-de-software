import {
  ContractFinancialSettings,
  GlobalFinancialSettings,
  InstallmentItem,
} from "../entities/FinancialSettings";

export type GlobalFinancialSettingsUpdate = Pick<
  GlobalFinancialSettings,
  "graceDays" | "fineRateBasisPoints" | "monthlyInterestBasisPoints" | "adminFeeBasisPoints"
> & { updatedBy?: string | null };

export type ContractFinancialSettingsUpdate = Pick<
  ContractFinancialSettings,
  "useOwnRules" | "graceDays" | "fineRateBasisPoints" | "monthlyInterestBasisPoints"
> & { updatedBy?: string | null };

export interface IFinancialRepository {
  getGlobalSettings(): Promise<GlobalFinancialSettings>;
  getContractSettings(contractId: string): Promise<ContractFinancialSettings | null>;
  updateGlobalSettings(settings: GlobalFinancialSettingsUpdate): Promise<GlobalFinancialSettings>;
  updateContractSettings(
    contractId: string,
    settings: ContractFinancialSettingsUpdate,
  ): Promise<ContractFinancialSettings>;
  listInstallmentItems(contractId: string, referenceMonth?: string): Promise<InstallmentItem[]>;
  findInstallmentItemById(id: string): Promise<InstallmentItem | null>;
  createInstallmentItem(item: InstallmentItem): Promise<InstallmentItem>;
  voidInstallmentItem(id: string, voidedAt: number, voidedBy?: string | null): Promise<void>;
}
