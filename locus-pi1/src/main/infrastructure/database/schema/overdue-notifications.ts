import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { rentals } from "./rentals";
import { clients } from "./clients";
import { propertyContracts } from "./property-history";

export const overdueNotifications = sqliteTable(
  "overdue_notifications",
  {
    id: text("id").primaryKey(),
    rentalId: text("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    contractId: text("contract_id")
      .references(() => propertyContracts.id, { onDelete: "set null" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    referenceMonth: text("reference_month").notNull(),
    dueDate: integer("due_date").notNull(),
    daysOverdue: integer("days_overdue").notNull(),
    originalAmount: real("original_amount").notNull(),
    interestAmount: real("interest_amount").notNull(),
    fineAmount: real("fine_amount").notNull(),
    totalAmount: real("total_amount").notNull(),
    message: text("message").notNull(),
    channel: text("channel", { enum: ["SYSTEM", "EMAIL", "WHATSAPP"] }).notNull().default("SYSTEM"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("overdue_notifications_rental_idx").on(table.rentalId),
    index("overdue_notifications_tenant_idx").on(table.tenantId),
    index("overdue_notifications_due_date_idx").on(table.dueDate),
    index("overdue_notifications_ref_idx").on(table.rentalId, table.referenceMonth),
  ]
);

