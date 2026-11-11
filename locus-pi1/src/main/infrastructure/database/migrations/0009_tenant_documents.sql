CREATE TABLE IF NOT EXISTS tenant_documents (
  id TEXT PRIMARY KEY NOT NULL,
  locatario_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nome_original TEXT NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes > 0),
  categoria TEXT NOT NULL DEFAULT 'outros' CHECK (categoria IN ('identificacao', 'comprovante_renda', 'antecedentes', 'contrato', 'outros')),
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tenant_documents_locatario_idx ON tenant_documents(locatario_id);
CREATE INDEX IF NOT EXISTS tenant_documents_date_idx ON tenant_documents(criado_em);
