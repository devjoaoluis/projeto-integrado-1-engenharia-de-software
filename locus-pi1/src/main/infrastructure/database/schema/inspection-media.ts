import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, check } from "drizzle-orm/sqlite-core";
import { propertyInspections } from "./property-history";

export const inspectionMedia = sqliteTable("inspection_media", {
  id: text("id").primaryKey(),
  inspectionId: text("inspection_id").notNull().references(() => propertyInspections.id, { onDelete: "restrict" }),
  type: text("type", { enum: ["IMAGE", "VIDEO"] }).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("inspection_media_inspection_idx").on(table.inspectionId),
  check("inspection_media_type_check", sql`${table.type} IN ('IMAGE', 'VIDEO')`),
  check("inspection_media_size_check", sql`${table.size} >= 0`),
]);
