import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { properties } from "./properties";
import { propertyContracts } from "./property-history";

export const financialSettings = sqliteTable("financial_settings", {
  id: integer("id").primaryKey(),
  graceDays: integer("grace_days").notNull().default(3),
  fineRateBasisPoints: integer("fine_rate_basis_points").notNull().default(1_000),
  monthlyInterestBasisPoints: integer("monthly_interest_basis_points").notNull().default(100),
  adminFeeBasisPoints: integer("admin_fee_basis_points").notNull().default(1_000),
  updatedAt: integer("updated_at").notNull(),
  updatedBy: text("updated_by"),
}, (table) => [
  check("financial_settings_singleton_check", sql`${table.id} = 1`),
  check("financial_settings_grace_check", sql`${table.graceDays} >= 0`),
  check("financial_settings_fine_check", sql`${table.fineRateBasisPoints} BETWEEN 0 AND 10000`),
  check("financial_settings_interest_check", sql`${table.monthlyInterestBasisPoints} BETWEEN 0 AND 10000`),
  check("financial_settings_admin_fee_check", sql`${table.adminFeeBasisPoints} BETWEEN 0 AND 10000`),
]);

export const contractFinancialSettings = sqliteTable("contract_financial_settings", {
  contractId: text("contract_id").primaryKey().references(() => propertyContracts.id, { onDelete: "cascade" }),
  useOwnRules: integer("use_own_rules", { mode: "boolean" }).notNull().default(false),
  graceDays: integer("grace_days").notNull().default(3),
  fineRateBasisPoints: integer("fine_rate_basis_points").notNull().default(1_000),
  monthlyInterestBasisPoints: integer("monthly_interest_basis_points").notNull().default(100),
  updatedAt: integer("updated_at").notNull(),
  updatedBy: text("updated_by"),
}, (table) => [
  check("contract_financial_rules_grace_check", sql`${table.graceDays} >= 0`),
  check("contract_financial_rules_fine_check", sql`${table.fineRateBasisPoints} BETWEEN 0 AND 10000`),
  check("contract_financial_rules_interest_check", sql`${table.monthlyInterestBasisPoints} BETWEEN 0 AND 10000`),
]);

export const rentalInstallmentItems = sqliteTable("rental_installment_items", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => propertyContracts.id, { onDelete: "restrict" }),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  referenceMonth: text("reference_month").notNull(),
  category: text("category", { enum: ["IPTU", "CONDOMINIO", "AGUA", "LUZ", "OUTRO"] }).notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: integer("created_at").notNull(),
  createdBy: text("created_by"),
  voidedAt: integer("voided_at"),
  voidedBy: text("voided_by"),
}, (table) => [
  index("rental_installment_items_contract_reference_idx").on(table.contractId, table.referenceMonth),
  check("rental_installment_items_reference_check", sql`${table.referenceMonth} GLOB '[0-1][0-9]/[0-9][0-9][0-9][0-9]'`),
  check("rental_installment_items_amount_check", sql`${table.amountCents} >= 0`),
  check("rental_installment_items_category_check", sql`${table.category} IN ('IPTU', 'CONDOMINIO', 'AGUA', 'LUZ', 'OUTRO')`),
]);
