import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "../../database/initializeDatabase";

const migrations = path.join(process.cwd(), "src/main/infrastructure/database/migrations");
const fixture = `
  INSERT INTO properties(id,title,address,price,status,created_at,updated_at) VALUES ('house','Casa','Rua',1000,'ALUGADO',1,1);
  INSERT INTO clients(id,name,cpf_cnpj,phone,created_at,updated_at) VALUES ('tenant','Cliente','123','999',1,1);
  INSERT INTO property_contracts(id,property_id,tenant_id,reference,monthly_rent,start_date,status,created_at)
    VALUES ('contract','house','tenant','CTR',1000,1,'ACTIVE',1);
`;

async function journal() {
  return JSON.parse(await fs.readFile(path.join(migrations, "meta/_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
}

describe("HU08 and HU11 integration", () => {
  it("keeps ordered migrations and cumulative snapshots consistent with both runtime modules", async () => {
    const entries = (await journal()).entries;
    assert.deepEqual(entries.slice(-2).map(entry => [entry.idx, entry.tag]), [
      [7, "0007_inspection_module"], [8, "0008_contract_templates"],
    ]);
    const previous = JSON.parse(await fs.readFile(path.join(migrations, "meta/0007_snapshot.json"), "utf8"));
    const latest = JSON.parse(await fs.readFile(path.join(migrations, "meta/0008_snapshot.json"), "utf8"));
    assert.equal(latest.prevId, previous.id);
    const database = createClient({ url: "file::memory:" });
    try {
      await initializeDatabase(database);
      for (const table of ["property_inspections", "inspection_media", "contract_templates"]) {
        assert.ok(latest.tables[table], `Missing table in cumulative snapshot: ${table}`);
        const actual = await database.execute(`PRAGMA table_info(${table})`);
        assert.deepEqual(Object.keys(latest.tables[table].columns).sort(), actual.rows.map(row => String(row.name)).sort());
      }
      assert.deepEqual((await database.execute("PRAGMA foreign_key_check")).rows, []);
    } finally { database.close(); }
  });

  for (const existingModule of ["templates", "inspections"] as const) {
    it(`upgrades a database containing only ${existingModule} without losing its records`, async () => {
      const database = createClient({ url: "file::memory:" });
      try {
        await database.execute("PRAGMA foreign_keys = ON");
        const omitted = existingModule === "templates" ? "0007_inspection_module" : "0008_contract_templates";
        for (const entry of (await journal()).entries) {
          if (entry.tag !== omitted) await database.executeMultiple(await fs.readFile(path.join(migrations, entry.tag + ".sql"), "utf8"));
        }
        await database.executeMultiple(fixture);
        if (existingModule === "templates") {
          await database.execute("INSERT INTO contract_templates VALUES ('template','Modelo','Texto {{imovel.endereco}}',1,1)");
          await database.execute("INSERT INTO property_inspections(id,property_id,inspected_at,description,created_at) VALUES ('inspection','house',1,'Legada',1)");
        } else {
          await database.execute("INSERT INTO property_inspections(id,property_id,contract_id,inspection_type,inspected_at,description,created_at) VALUES ('inspection','house','contract','ENTRY',1,'Entrada',1)");
          await database.execute("INSERT INTO inspection_media VALUES ('photo','inspection','IMAGE','photo.jpg','/test/photo.jpg','image/jpeg',4,1)");
        }
        await initializeDatabase(database);
        await initializeDatabase(database);
        const inspection = (await database.execute("SELECT * FROM property_inspections WHERE id = 'inspection'")).rows[0];
        assert.ok(inspection);
        if (existingModule === "templates") {
          assert.equal((await database.execute("SELECT content FROM contract_templates WHERE id = 'template'")).rows[0].content, "Texto {{imovel.endereco}}");
          assert.equal(inspection.contract_id, null);
          assert.equal(inspection.inspection_type, null);
          await database.execute("INSERT INTO property_inspections(id,property_id,contract_id,inspection_type,inspected_at,description,created_at) VALUES ('entry','house','contract','ENTRY',1,'Nova entrada',1)");
        } else {
          assert.equal(inspection.contract_id, "contract");
          assert.equal(inspection.inspection_type, "ENTRY");
          assert.equal((await database.execute("SELECT file_path FROM inspection_media WHERE id = 'photo'")).rows[0].file_path, "/test/photo.jpg");
          await database.execute("INSERT INTO contract_templates VALUES ('template','Modelo','Texto novo',1,1)");
        }
        assert.equal((await database.execute("SELECT reference FROM property_contracts WHERE id = 'contract'")).rows[0].reference, "CTR");
        assert.deepEqual((await database.execute("PRAGMA foreign_key_check")).rows, []);
      } finally { database.close(); }
    });
  }
});
