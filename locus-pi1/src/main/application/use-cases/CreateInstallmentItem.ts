import crypto from "node:crypto";
import {
  InstallmentItem,
  InstallmentItemCategory,
} from "../../domain/entities/FinancialSettings";
import { IFinancialRepository } from "../../domain/repositories/IFinancialRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export interface CreateInstallmentItemInput {
  contractId: string;
  referenceMonth: string;
  category: InstallmentItemCategory;
  description: string;
  amountCents: number;
  createdBy?: string | null;
}

const categories: InstallmentItemCategory[] = ["IPTU", "CONDOMINIO", "AGUA", "LUZ", "OUTRO"];

export class CreateInstallmentItem {
  constructor(
    private financialRepository: IFinancialRepository,
    private historyRepository: IPropertyHistoryRepository,
  ) {}

  async execute(input: CreateInstallmentItemInput): Promise<InstallmentItem> {
    if (!input || typeof input !== "object") throw new Error("Informe o lançamento mensal.");
    const contractId = typeof input.contractId === "string" ? input.contractId.trim() : "";
    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (!contractId) throw new Error("Selecione um contrato para o lançamento.");
    if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(input.referenceMonth)) {
      throw new Error("A competência deve estar no formato MM/AAAA.");
    }
    if (!categories.includes(input.category)) throw new Error("Selecione uma categoria válida.");
    if (!description || description.length > 180) {
      throw new Error("A descrição deve ter entre 1 e 180 caracteres.");
    }
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("O valor do lançamento deve ser positivo e informado em centavos inteiros.");
    }
    const contract = await this.historyRepository.findContractById(contractId);
    if (!contract) throw new Error("Contrato não encontrado.");
    const now = Date.now();
    return this.financialRepository.createInstallmentItem({
      id: crypto.randomUUID(),
      contractId,
      propertyId: contract.propertyId,
      referenceMonth: input.referenceMonth,
      category: input.category,
      description,
      amountCents: input.amountCents,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      voidedAt: null,
      voidedBy: null,
    });
  }
}
