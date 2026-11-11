import { Client } from "@libsql/client";

export const inspectionModuleTables = `
CREATE TABLE IF NOT EXISTS inspection_media (
  id TEXT PRIMARY KEY NOT NULL,
  inspection_id TEXT NOT NULL REFERENCES property_inspections(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('IMAGE', 'VIDEO')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS inspection_media_inspection_idx ON inspection_media(inspection_id);
CREATE INDEX IF NOT EXISTS property_inspections_contract_date_idx ON property_inspections(contract_id, inspected_at);
CREATE TRIGGER IF NOT EXISTS inspections_contract_insert BEFORE INSERT ON property_inspections
WHEN (NEW.contract_id IS NULL) != (NEW.inspection_type IS NULL)
  OR (NEW.inspection_type IS NOT NULL AND NEW.inspection_type NOT IN ('ENTRY', 'EXIT'))
  OR (NEW.contract_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM property_contracts WHERE id = NEW.contract_id AND property_id = NEW.property_id
  ))
BEGIN SELECT RAISE(ABORT, 'Vistoria deve estar vinculada a um contrato do mesmo imóvel.'); END;
CREATE TRIGGER IF NOT EXISTS inspections_contract_update BEFORE UPDATE OF contract_id, property_id, inspection_type ON property_inspections
WHEN (NEW.contract_id IS NULL) != (NEW.inspection_type IS NULL)
  OR (NEW.inspection_type IS NOT NULL AND NEW.inspection_type NOT IN ('ENTRY', 'EXIT'))
  OR (NEW.contract_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM property_contracts WHERE id = NEW.contract_id AND property_id = NEW.property_id
  ))
BEGIN SELECT RAISE(ABORT, 'Vistoria deve estar vinculada a um contrato do mesmo imóvel.'); END;
CREATE TRIGGER IF NOT EXISTS inspections_contract_property_update BEFORE UPDATE OF property_id ON property_contracts
WHEN EXISTS (SELECT 1 FROM property_inspections WHERE contract_id = OLD.id AND property_id != NEW.property_id)
BEGIN SELECT RAISE(ABORT, 'Contrato possui vistoria vinculada a outro imóvel.'); END;
`;

export async function initializeInspectionModule(client: Client): Promise<void> {
  const columns = new Set((await client.execute("PRAGMA table_info(property_inspections)")).rows.map(row => row.name));
  if (!columns.has("contract_id")) {
    await client.execute("ALTER TABLE property_inspections ADD COLUMN contract_id TEXT REFERENCES property_contracts(id) ON DELETE RESTRICT");
  }
  if (!columns.has("inspection_type")) {
    await client.execute("ALTER TABLE property_inspections ADD COLUMN inspection_type TEXT");
  }
  await client.executeMultiple(inspectionModuleTables);
}
