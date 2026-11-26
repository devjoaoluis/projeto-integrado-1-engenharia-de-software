import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, uniqueIndex, check, AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { properties } from "./properties";
import { clients } from "./clients";

export const rentals = sqliteTable("rentals", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  tenantId: text("tenant_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  monthlyRent: real("monthly_rent").notNull(),
  startDate: integer("start_date").notNull(),
  dueDay: integer("due_day").notNull(),
  parentRentalId: text("parent_rental_id").references((): AnySQLiteColumn => rentals.id, { onDelete: "restrict" }),
  formalConsent: text("formal_consent"),
  contractSigned: integer("contract_signed", { mode: "boolean" }).notNull().default(false),
  signaturesNotarized: integer("signatures_notarized", { mode: "boolean" }).notNull().default(false),
  initialPaymentsPaid: integer("initial_payments_paid", { mode: "boolean" }).notNull().default(false),
  keysReleasedAt: integer("keys_released_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("rentals_property_primary_unique").on(table.propertyId).where(sql`${table.parentRentalId} IS NULL`),
  uniqueIndex("rentals_property_tenant_unique").on(table.propertyId, table.tenantId),
  check("rentals_contract_boolean", sql`${table.contractSigned} IN (0, 1)`),
  check("rentals_signatures_boolean", sql`${table.signaturesNotarized} IN (0, 1)`),
  check("rentals_payments_boolean", sql`${table.initialPaymentsPaid} IN (0, 1)`),
  check("rentals_positive_rent", sql`${table.monthlyRent} > 0`),
  check("rentals_due_day", sql`${table.dueDay} BETWEEN 1 AND 31`),
  check("rentals_formal_consent", sql`${table.parentRentalId} IS NULL OR (${table.formalConsent} IS NOT NULL AND length(trim(${table.formalConsent})) > 0)`),
  check("rentals_keys_prerequisites", sql`${table.keysReleasedAt} IS NULL OR (${table.contractSigned} = 1 AND ${table.signaturesNotarized} = 1 AND ${table.initialPaymentsPaid} = 1)`),
]);
