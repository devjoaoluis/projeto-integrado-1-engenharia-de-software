import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { clients } from "./clients";
import { DOCUMENT_CATEGORIES } from "../../../domain/entities/TenantDocument";

export const tenantDocuments = sqliteTable("tenant_documents", {
  id: text("id").primaryKey(),
  locatarioId: text("locatario_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  nomeOriginal: text("nome_original").notNull(),
  caminhoArquivo: text("caminho_arquivo").notNull(),
  mimeType: text("mime_type").notNull(),
  tamanhoBytes: integer("tamanho_bytes").notNull(),
  categoria: text("categoria", { enum: DOCUMENT_CATEGORIES })
    .notNull()
    .default("outros"),
  criadoEm: integer("criado_em").notNull(),
}, (table) => [
  index("tenant_documents_locatario_idx").on(table.locatarioId),
  index("tenant_documents_date_idx").on(table.criadoEm),
]);
