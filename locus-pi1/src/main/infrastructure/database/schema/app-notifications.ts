import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appNotifications = sqliteTable(
  "app_notifications",
  {
    id: text("id").primaryKey(),
    category: text("category", { enum: ["VISIT", "OVERDUE", "SYSTEM"] }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    target: text("target").notNull(),
    entityId: text("entity_id"),
    dataJson: text("data_json").notNull().default("{}"),
    createdAt: integer("created_at").notNull(),
    readAt: integer("read_at"),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("app_notifications_created_at_idx").on(table.createdAt),
    index("app_notifications_read_at_idx").on(table.readAt),
  ]
);
