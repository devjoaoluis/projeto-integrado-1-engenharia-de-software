import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood"),
  bedrooms: integer("bedrooms"),
  description: text("description"),
  price: real("price").notNull(),
  iptu: real("iptu"),
  type: text("type"),
  fiscalStatus: text("fiscal_status"),
  sanitationStatus: text("sanitation_status"),
  registrationDate: text("registration_date"),
  ownerId: text("owner_id"),
  status: text("status", {
    enum: ["CADASTRADO", "DISPONIVEL", "VENDIDO", "ALUGADO", "INATIVO"],
  })
    .notNull()
    .default("CADASTRADO"),
  searchNormalized: text("search_normalized"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => {
  return {
    statusNeighborhoodIdx: index("idx_status_neighborhood").on(table.status, table.neighborhood),
    priceIdx: index("idx_price").on(table.price),
    bedroomsIdx: index("idx_bedrooms").on(table.bedrooms),
  };
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
