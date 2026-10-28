import { TenantDocument, DocumentCategory } from "../entities/TenantDocument";

export interface ITenantDocumentRepository {
  create(document: TenantDocument): Promise<TenantDocument>;
  findById(id: string): Promise<TenantDocument | null>;
  findByLocatarioId(locatarioId: string): Promise<TenantDocument[]>;
  updateCategoria(id: string, categoria: DocumentCategory): Promise<TenantDocument>;
  delete(id: string): Promise<void>;
}
