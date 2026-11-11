export const DOCUMENT_CATEGORIES = [
  "identificacao",
  "comprovante_renda",
  "antecedentes",
  "contrato",
  "outros",
] as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export interface TenantDocument {
  id: string;
  locatarioId: string;
  nomeOriginal: string;
  caminhoArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  categoria: DocumentCategory;
  criadoEm: number;
}
