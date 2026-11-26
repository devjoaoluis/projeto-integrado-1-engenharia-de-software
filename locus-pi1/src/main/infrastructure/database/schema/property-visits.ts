import { sqliteTable, text, integer, index, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { properties } from "./properties";
import { clients } from "./clients";

export const propertyVisits = sqliteTable(
  "property_visits",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    scheduledAt: integer("scheduled_at").notNull(),
    status: text("status", { enum: ["AGENDADA", "REALIZADA", "CANCELADA"] })
      .notNull()
      .default("AGENDADA"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("property_visits_property_idx").on(table.propertyId),
    index("property_visits_client_idx").on(table.clientId),
    index("property_visits_scheduled_idx").on(table.scheduledAt),
    check(
      "property_visits_status_check",
      sql`${table.status} IN ('AGENDADA', 'REALIZADA', 'CANCELADA')`
    ),
  ]
);
