import { FinancialLateRules } from "./FinancialCharges";

export interface GlobalFinancialSettings extends FinancialLateRules {
  adminFeeBasisPoints: number;
  updatedAt: number;
  updatedBy: string | null;
}

export interface ContractFinancialSettings extends FinancialLateRules {
  useOwnRules: boolean;
  updatedAt: number;
  updatedBy: string | null;
}

export type InstallmentItemCategory = "IPTU" | "CONDOMINIO" | "AGUA" | "LUZ" | "OUTRO";

export interface InstallmentItem {
  id: string;
  contractId: string;
  propertyId: string;
  referenceMonth: string;
  category: InstallmentItemCategory;
  description: string;
  amountCents: number;
  createdAt: number;
  createdBy: string | null;
  voidedAt: number | null;
  voidedBy: string | null;
}
