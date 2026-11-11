import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { propertyVisits } from "./property-visits";

export const visitReminders = sqliteTable(
  "visit_reminders",
  {
    id: text("id").primaryKey(),
    visitId: text("visit_id")
      .notNull()
      .references(() => propertyVisits.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    triggeredAt: integer("triggered_at").notNull(),
    dismissedAt: integer("dismissed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("visit_reminders_visit_stage_idx").on(table.visitId, table.stage),
    index("visit_reminders_visit_idx").on(table.visitId),
  ]
);
