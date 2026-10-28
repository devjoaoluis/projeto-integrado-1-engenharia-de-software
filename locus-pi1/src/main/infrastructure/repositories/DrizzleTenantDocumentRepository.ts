import { desc, eq } from "drizzle-orm";
import { db } from "../database/db";
import { tenantDocuments } from "../database/schema/tenant-documents";
import { TenantDocument, DocumentCategory } from "../../domain/entities/TenantDocument";
import { ITenantDocumentRepository } from "../../domain/repositories/ITenantDocumentRepository";

export class DrizzleTenantDocumentRepository implements ITenantDocumentRepository {
  async create(document: TenantDocument): Promise<TenantDocument> {
    await db.insert(tenantDocuments).values({
      id: document.id,
      locatarioId: document.locatarioId,
      nomeOriginal: document.nomeOriginal,
      caminhoArquivo: document.caminhoArquivo,
      mimeType: document.mimeType,
      tamanhoBytes: document.tamanhoBytes,
      categoria: document.categoria,
      criadoEm: document.criadoEm,
    });
    return document;
  }

  async findById(id: string): Promise<TenantDocument | null> {
    const result = await db
      .select()
      .from(tenantDocuments)
      .where(eq(tenantDocuments.id, id))
      .get();
    return result ? (result as TenantDocument) : null;
  }

  async findByLocatarioId(locatarioId: string): Promise<TenantDocument[]> {
    const results = await db
      .select()
      .from(tenantDocuments)
      .where(eq(tenantDocuments.locatarioId, locatarioId))
      .orderBy(desc(tenantDocuments.criadoEm), desc(tenantDocuments.id));
    return results as TenantDocument[];
  }

  async updateCategoria(id: string, categoria: DocumentCategory): Promise<TenantDocument> {
    const updated = await db
      .update(tenantDocuments)
      .set({ categoria })
      .where(eq(tenantDocuments.id, id))
      .returning()
      .get();
    if (!updated) {
      throw new Error("Documento não encontrado.");
    }
    return updated as TenantDocument;
  }

  async delete(id: string): Promise<void> {
    await db.delete(tenantDocuments).where(eq(tenantDocuments.id, id)).run();
  }
}
