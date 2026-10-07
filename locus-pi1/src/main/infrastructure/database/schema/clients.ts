import { guarantors } from "./contacts";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  cpfCnpj: text("cpf_cnpj").notNull().unique(),
  phone: text("phone").notNull(),
  email: text("email"),
  type: text("type", { enum: ["TENANT", "INTERESTED"] }).notNull().default("INTERESTED"),
  guarantorId: text("guarantor_id").references(() => guarantors.id, { onDelete: "restrict" }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
