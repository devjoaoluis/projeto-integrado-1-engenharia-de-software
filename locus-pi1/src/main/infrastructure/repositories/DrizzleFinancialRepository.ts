import { and, eq, isNull } from "drizzle-orm";
import {
  ContractFinancialSettings,
  GlobalFinancialSettings,
  InstallmentItem,
} from "../../domain/entities/FinancialSettings";
import {
  ContractFinancialSettingsUpdate,
  GlobalFinancialSettingsUpdate,
  IFinancialRepository,
} from "../../domain/repositories/IFinancialRepository";
import { db } from "../database/db";
import {
  contractFinancialSettings,
  financialSettings,
  rentalInstallmentItems,
} from "../database/schema/financial";

export class DrizzleFinancialRepository implements IFinancialRepository {
  async getGlobalSettings(): Promise<GlobalFinancialSettings> {
    const row = await db.select().from(financialSettings).where(eq(financialSettings.id, 1)).get();
    if (!row) throw new Error("As regras financeiras ainda não foram inicializadas.");
    return {
      graceDays: row.graceDays,
      fineRateBasisPoints: row.fineRateBasisPoints,
      monthlyInterestBasisPoints: row.monthlyInterestBasisPoints,
      adminFeeBasisPoints: row.adminFeeBasisPoints,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async getContractSettings(contractId: string): Promise<ContractFinancialSettings | null> {
    const row = await db
      .select()
      .from(contractFinancialSettings)
      .where(eq(contractFinancialSettings.contractId, contractId))
      .get();
    if (!row) return null;
    return {
      useOwnRules: row.useOwnRules,
      graceDays: row.graceDays,
      fineRateBasisPoints: row.fineRateBasisPoints,
      monthlyInterestBasisPoints: row.monthlyInterestBasisPoints,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async updateGlobalSettings(settings: GlobalFinancialSettingsUpdate): Promise<GlobalFinancialSettings> {
    const updatedAt = Date.now();
    const row = await db
      .insert(financialSettings)
      .values({ id: 1, ...settings, updatedAt })
      .onConflictDoUpdate({
        target: financialSettings.id,
        set: { ...settings, updatedAt },
      })
      .returning()
      .get();
    return {
      graceDays: row.graceDays,
      fineRateBasisPoints: row.fineRateBasisPoints,
      monthlyInterestBasisPoints: row.monthlyInterestBasisPoints,
      adminFeeBasisPoints: row.adminFeeBasisPoints,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async updateContractSettings(
    contractId: string,
    settings: ContractFinancialSettingsUpdate,
  ): Promise<ContractFinancialSettings> {
    const updatedAt = Date.now();
    const row = await db
      .insert(contractFinancialSettings)
      .values({ contractId, ...settings, updatedAt })
      .onConflictDoUpdate({
        target: contractFinancialSettings.contractId,
        set: { ...settings, updatedAt },
      })
      .returning()
      .get();
    return {
      useOwnRules: row.useOwnRules,
      graceDays: row.graceDays,
      fineRateBasisPoints: row.fineRateBasisPoints,
      monthlyInterestBasisPoints: row.monthlyInterestBasisPoints,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async listInstallmentItems(contractId: string, referenceMonth?: string): Promise<InstallmentItem[]> {
    const conditions = [
      eq(rentalInstallmentItems.contractId, contractId),
      isNull(rentalInstallmentItems.voidedAt),
    ];
    if (referenceMonth) {
      conditions.push(eq(rentalInstallmentItems.referenceMonth, referenceMonth));
    }
    return db
      .select()
      .from(rentalInstallmentItems)
      .where(and(...conditions))
      .all();
  }

  async findInstallmentItemById(id: string): Promise<InstallmentItem | null> {
    return (await db
      .select()
      .from(rentalInstallmentItems)
      .where(eq(rentalInstallmentItems.id, id))
      .get()) ?? null;
  }

  async createInstallmentItem(item: InstallmentItem): Promise<InstallmentItem> {
    await db.insert(rentalInstallmentItems).values(item);
    return item;
  }

  async voidInstallmentItem(id: string, voidedAt: number, voidedBy: string | null = null): Promise<void> {
    const result = await db
      .update(rentalInstallmentItems)
      .set({ voidedAt, voidedBy })
      .where(and(eq(rentalInstallmentItems.id, id), isNull(rentalInstallmentItems.voidedAt)))
      .returning({ id: rentalInstallmentItems.id })
      .get();
    if (!result) throw new Error("O lançamento mensal não foi encontrado ou já foi cancelado.");
  }
}
