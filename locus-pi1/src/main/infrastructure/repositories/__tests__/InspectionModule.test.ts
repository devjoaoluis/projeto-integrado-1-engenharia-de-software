import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "../../database/initializeDatabase";
import { Inspection } from "../../../domain/entities/Inspection";
import { GetInspection } from "../../../application/use-cases/GetInspection";
import { ListInspections } from "../../../application/use-cases/ListInspections";
import { sqlite, inspections, properties, history, migrations } from "./inspectionTestSetup";
const get = new GetInspection(inspections);
const list = new ListInspections(inspections, properties, history);

describe("HU08 inspection module", () => {
  it("stores the property/contract link and reads it by inspection, property or contract", async () => {
    const entry: Inspection = { id: "module-test", propertyId: "property", contractId: "contract", type: "ENTRY" as const,
      inspectedAt: 1, description: "Registro do módulo", reportReference: null, createdAt: 1 };
    await inspections.create(entry, []);
    assert.equal((await get.execute(entry.id)).contractId, "contract");
    assert.deepEqual((await list.execute({ propertyId: "property" })).map(item => item.id), [entry.id]);
    assert.deepEqual((await list.execute({ contractId: "contract" })).map(item => item.id), [entry.id]);
    await assert.rejects(inspections.create({ ...entry, id: "invalid", contractId: "other-contract" }, []), (error: Error & { cause?: Error }) => /mesmo imóvel/.test(error.cause?.message ?? error.message));
  });
  it("rejects invalid filters and keeps legacy records in the original history", async () => {
    await assert.rejects(list.execute({}));
    await assert.rejects(get.execute("missing"));
    await sqlite.execute("INSERT INTO property_inspections(id,property_id,inspected_at,description,created_at) VALUES ('legacy','property',1,'Anterior',1)");
    assert.deepEqual(await list.execute({ propertyId: "property" }), []);
    assert.equal((await history.findByPropertyId("property")).inspections.length, 1);
  });
  it("registers consultation IPC without depending on the entry recorder", async () => {
    const electronModule = require.resolve("electron");
    const previous = require.cache[electronModule];
    const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
    require.cache[electronModule] = { exports: { ipcMain: { handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) => handlers.set(name, handler) } } } as NodeModule;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
      require("../../../ipc/inspections.ipc").registerInspectionsIpc();
      assert.deepEqual([...handlers.keys()], ["inspections:get", "inspections:list"]);
      assert.deepEqual(await handlers.get("inspections:list")({}, { propertyId: "property" }), []);
    } finally {
      if (previous) require.cache[electronModule] = previous; else delete require.cache[electronModule];
    }
  });
});
describe("HU08 module database upgrades", () => {
  it("upgrades an existing database idempotently, retaining legacy inspections", async () => {
    const legacy = createClient({ url: "file::memory:" });
    try {
      const journal = JSON.parse(await fs.readFile(path.join(migrations, "meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
      for (const entry of journal.entries.slice(0, 7)) await legacy.executeMultiple(await fs.readFile(path.join(migrations, entry.tag + ".sql"), "utf8"));
      await legacy.executeMultiple("INSERT INTO properties(id,title,address,price,status,created_at,updated_at) VALUES ('old','Antigo','Rua',10,'CADASTRADO',1,1); INSERT INTO property_inspections VALUES ('legacy','old',1,'Vistoria antiga',NULL,1);");
      await initializeDatabase(legacy);
      await initializeDatabase(legacy);
      const row = (await legacy.execute("SELECT * FROM property_inspections")).rows[0];
      assert.equal(row.description, "Vistoria antiga"); assert.equal(row.contract_id, null); assert.equal(row.inspection_type, null);
      assert.deepEqual((await legacy.execute("PRAGMA foreign_key_check")).rows, []);
    } finally { legacy.close(); }
  });
  it("applies the complete migration journal and can initialize again without duplicate columns", async () => {
    const migrated = createClient({ url: "file::memory:" });
    try {
      await migrated.execute("PRAGMA foreign_keys = ON");
      const journal = JSON.parse(await fs.readFile(path.join(migrations, "meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
      for (const entry of journal.entries) await migrated.executeMultiple(await fs.readFile(path.join(migrations, entry.tag + ".sql"), "utf8"));
      await initializeDatabase(migrated); await initializeDatabase(migrated);
      assert.equal((await migrated.execute("PRAGMA table_info(property_inspections)")).rows.length, 8);
      assert.deepEqual((await migrated.execute("PRAGMA foreign_key_check")).rows, []);
    } finally { migrated.close(); }
  });
});
