import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, check } from "drizzle-orm/sqlite-core";

export const contractTemplates = sqliteTable("contract_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  check("contract_templates_name_check", sql`length(trim(${table.name})) > 0`),
  check("contract_templates_content_check", sql`length(trim(${table.content})) > 0`),
]);
