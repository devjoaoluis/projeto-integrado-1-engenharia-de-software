import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  status: text("status", {
    enum: ["CADASTRADO", "DISPONIVEL", "VENDIDO", "ALUGADO", "INATIVO"],
  })
    .notNull()
    .default("CADASTRADO"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const propertyMedia = sqliteTable("property_media", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["IMAGE", "VIDEO"] }).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
});
