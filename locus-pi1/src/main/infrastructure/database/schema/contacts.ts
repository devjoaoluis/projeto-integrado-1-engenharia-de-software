import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

function columns() {
  return {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cpfCnpj: text("cpf_cnpj").notNull().unique(),
    phone: text("phone").notNull(),
    email: text("email"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  };
}

export const owners = sqliteTable("owners", columns());

export const guarantors = sqliteTable("guarantors", columns());
