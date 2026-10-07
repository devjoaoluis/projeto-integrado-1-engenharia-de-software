import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex, foreignKey, check } from "drizzle-orm/sqlite-core";
import { properties } from "./properties";
import { clients } from "./clients";
import { rentals } from "./rentals";

export const propertyContracts = sqliteTable("property_contracts", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  tenantId: text("tenant_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  rentalId: text("rental_id").references(() => rentals.id, { onDelete: "restrict" }),
  reference: text("reference").notNull(),
  monthlyRent: real("monthly_rent").notNull(),
  startDate: integer("start_date").notNull(),
  endDate: integer("end_date"),
  status: text("status", { enum: ["ACTIVE", "ENDED", "CANCELLED"] }).notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("property_contracts_property_date_idx").on(table.propertyId, table.startDate),
  uniqueIndex("property_contracts_id_property_unique").on(table.id, table.propertyId),
  check("property_contracts_amount_check", sql`${table.monthlyRent} > 0`),
  check("property_contracts_dates_check", sql`${table.startDate} >= 0 AND (${table.endDate} IS NULL OR ${table.endDate} > ${table.startDate})`),
  check("property_contracts_status_check", sql`${table.status} IN ('ACTIVE', 'ENDED', 'CANCELLED')`),
  check("property_contracts_ended_check", sql`${table.status} != 'ENDED' OR ${table.endDate} IS NOT NULL`),
]);

export const propertyPayments = sqliteTable("property_payments", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  contractId: text("contract_id").notNull(),
  amount: real("amount").notNull(),
  paidAt: integer("paid_at").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  foreignKey({ columns: [table.contractId, table.propertyId], foreignColumns: [propertyContracts.id, propertyContracts.propertyId] }).onDelete("restrict"),
  index("property_payments_property_date_idx").on(table.propertyId, table.paidAt),
  check("property_payments_amount_check", sql`${table.amount} > 0`),
  check("property_payments_date_check", sql`${table.paidAt} >= 0`),
]);

export const propertyInspections = sqliteTable("property_inspections", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  inspectedAt: integer("inspected_at").notNull(),
  description: text("description").notNull(),
  reportReference: text("report_reference"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("property_inspections_property_date_idx").on(table.propertyId, table.inspectedAt),
  check("property_inspections_date_check", sql`${table.inspectedAt} >= 0`),
]);

export const propertyMaintenances = sqliteTable("property_maintenances", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  performedAt: integer("performed_at").notNull(),
  description: text("description").notNull(),
  cost: real("cost"),
  status: text("status", { enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] }).notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("property_maintenances_property_date_idx").on(table.propertyId, table.performedAt),
  check("property_maintenances_cost_check", sql`${table.cost} IS NULL OR ${table.cost} >= 0`),
  check("property_maintenances_date_check", sql`${table.performedAt} >= 0`),
  check("property_maintenances_status_check", sql`${table.status} IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')`),
]);
