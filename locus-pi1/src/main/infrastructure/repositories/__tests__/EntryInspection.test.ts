import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { RecordEntryInspection, RecordEntryInspectionDTO } from "../../../application/use-cases/RecordEntryInspection";
import { GetInspection } from "../../../application/use-cases/GetInspection";
import { ListInspections } from "../../../application/use-cases/ListInspections";
import { GetPropertyOverview } from "../../../application/use-cases/GetPropertyOverview";
import { IFileStorage } from "../../../domain/repositories/IFileStorage";
import { Inspection, InspectionMedia } from "../../../domain/entities/Inspection";
import { sqlite, inspections, properties, history, storage, input, storageDir, photo, video, temp, copiedFiles,
  DrizzleInspectionRepository, DrizzlePropertyMediaRepository } from "./inspectionTestSetup";
const record = new RecordEntryInspection(inspections, properties, history, storage);
const get = new GetInspection(inspections);
const list = new ListInspections(inspections, properties, history);
describe("HU08 inspection module and entry attachments", () => {
  it("persists an entry linked to its contract with copied photo and video", async () => {
    const result = await record.execute(input());
    assert.equal(result.type, "ENTRY");
    assert.equal(result.contractId, "contract");
    assert.deepEqual(result.media.map(item => item.type), ["IMAGE", "VIDEO"]);
    assert.deepEqual(result.media.map(item => item.mimeType), ["image/jpeg", "video/webm"]);
    for (const media of result.media) {
      assert.equal(media.inspectionId, result.id);
      assert.ok(media.filePath.startsWith(path.join(storageDir, "media", "inspections", result.id)));
      assert.ok(media.size > 0);
      assert.deepEqual(await fs.readFile(media.filePath), await fs.readFile(media.type === "IMAGE" ? photo : video));
    }
    assert.deepEqual((await get.execute(result.id)).media.map(item => item.id).sort(), result.media.map(item => item.id).sort());
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM property_media")).rows[0].n, 0);
  });
  it("lists only inspections belonging to the requested property or contract", async () => {
    const result = await record.execute(input());
    assert.deepEqual((await list.execute({ propertyId: "property" })).map(item => item.id), [result.id]);
    assert.deepEqual((await list.execute({ contractId: "contract" })).map(item => item.id), [result.id]);
    assert.deepEqual(await list.execute({ propertyId: "other" }), []);
    assert.deepEqual(await list.execute({ contractId: "other-contract" }), []);
    await assert.rejects(list.execute({}), /somente/);
    await assert.rejects(list.execute({ propertyId: "property", contractId: "contract" }), /somente/);
    await assert.rejects(list.execute({ propertyId: "missing" }), /não encontrado/);
    await assert.rejects(list.execute({ contractId: "missing" }), /não encontrado/);
    await assert.rejects(get.execute("missing"), /não encontrada/);
  });
  it("remains visible in the existing HU05 property overview", async () => {
    const result = await record.execute(input());
    const overview = new GetPropertyOverview(properties, new DrizzlePropertyMediaRepository(), history);
    const view = await overview.execute("property");
    assert.equal(view.inspections[0].id, result.id);
    assert.equal(view.inspections[0].contractId, "contract");
    assert.equal(view.inspections[0].type, "ENTRY");
  });
  it("rejects missing properties, mismatched contracts and cancelled contracts", async () => {
    await assert.rejects(record.execute({ ...input(), propertyId: "missing" }), /Imóvel/);
    await assert.rejects(record.execute({ ...input(), contractId: "missing" }), /contrato/);
    await assert.rejects(record.execute({ ...input(), contractId: "other-contract" }), /contrato/);
    await sqlite.execute("UPDATE property_contracts SET status = 'CANCELLED' WHERE id = 'contract'");
    await assert.rejects(record.execute(input()), /cancelado/);
    assert.deepEqual(await copiedFiles(), []);
  });
  it("validates dates, description, inputs and rejects attempts to record exits through the entry endpoint", async () => {
    for (const inspectedAt of [-1, 1.5, NaN, Infinity, Date.now() + 86400000]) {
      await assert.rejects(record.execute({ ...input(), inspectedAt }));
    }
    await assert.rejects(record.execute({ ...input(), description: "  " }));
    await assert.rejects(record.execute({ ...input(), contractId: "" }));
    await assert.rejects(record.execute({ ...input(), sourceFilePaths: [null as unknown as string] }));
    await assert.rejects(record.execute(null));
    await assert.rejects(record.execute({ ...input(), type: "EXIT" } as RecordEntryInspectionDTO));
    await assert.rejects(record.execute({ ...input(), id: "caller-id" } as RecordEntryInspectionDTO));
    assert.deepEqual(await copiedFiles(), []);
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM property_inspections")).rows[0].n, 0);
  });
  it("accepts records without attachments without imposing the partner's RN03 rule", async () => {
    const result = await record.execute({ ...input(), sourceFilePaths: [] });
    assert.deepEqual(result.media, []);
    assert.equal(result.type, "ENTRY");
  });
  it("validates all sources before copying and preserves source files", async () => {
    const invalid = path.join(temp, "arquivo.txt");
    const empty = path.join(temp, "vazio.jpg");
    await fs.writeFile(invalid, "not a photo"); await fs.writeFile(empty, "");
    for (const filename of [invalid, empty, path.join(temp, "missing.png"), temp]) {
      await assert.rejects(record.execute({ ...input(), sourceFilePaths: [photo, filename] }));
      assert.deepEqual(await copiedFiles(), []);
    }
    assert.ok((await fs.stat(photo)).isFile());
  });
  it("rolls back inspection and copied files if a media insert fails", async () => {
    const failing = new class extends DrizzleInspectionRepository {
      async create(inspection: Inspection, media: InspectionMedia[]) {
        return super.create(inspection, media.map(item => ({ ...item, inspectionId: "missing" })));
      }
    }();
    await assert.rejects(new RecordEntryInspection(failing, properties, history, storage).execute(input()));
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM property_inspections")).rows[0].n, 0);
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM inspection_media")).rows[0].n, 0);
    assert.deepEqual(await copiedFiles(), []);
  });
  it("cleans partial copies when a later file copy fails", async () => {
    let copies = 0;
    const failingStorage: IFileStorage = { ...storage, save: async (source, dir, name) => {
      const result = await storage.save(source, dir, name);
      if (++copies === 2) throw new Error("Disk failure");
      return result;
    } };
    await assert.rejects(new RecordEntryInspection(inspections, properties, history, failingStorage).execute(input()), /Disk failure/);
    assert.deepEqual(await copiedFiles(), []);
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM property_inspections")).rows[0].n, 0);
  });
  it("cleans files when the contract disappears after validation", async () => {
    const concurrentStorage: IFileStorage = { ...storage, save: async (source, dir, name) => {
      const result = await storage.save(source, dir, name);
      await sqlite.execute("DELETE FROM property_contracts WHERE id = 'contract'");
      return result;
    } };
    await assert.rejects(new RecordEntryInspection(inspections, properties, history, concurrentStorage).execute(input()));
    assert.deepEqual(await copiedFiles(), []);
  });
  it("enforces contract/property consistency and protects evidence at the database boundary", async () => {
    const result = await record.execute(input());
    await assert.rejects(sqlite.execute({ sql: "UPDATE property_inspections SET contract_id = 'other-contract' WHERE id = ?", args: [result.id] }), /mesmo imóvel/);
    await assert.rejects(sqlite.execute("UPDATE property_contracts SET property_id = 'other' WHERE id = 'contract'"), /vistoria/);
    await assert.rejects(sqlite.execute("DELETE FROM property_contracts WHERE id = 'contract'"), /FOREIGN KEY/);
    await assert.rejects(sqlite.execute({ sql: "DELETE FROM property_inspections WHERE id = ?", args: [result.id] }), /FOREIGN KEY/);
  });
});


it("registers only the entry recording IPC handler", async () => {
  const electronModule = require.resolve("electron");
  const previous = require.cache[electronModule];
  const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
  require.cache[electronModule] = { exports: { ipcMain: { handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) => handlers.set(name, handler) }, app: { getPath: () => storageDir } } } as NodeModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
    require("../../../ipc/inspection-entry.ipc").registerInspectionEntryIpc();
    assert.deepEqual([...handlers.keys()], ["inspections:record-entry"]);
    const entry = await handlers.get("inspections:record-entry")({}, input()) as { id: string };
    assert.equal((await get.execute(entry.id)).contractId, "contract");
  } finally {
    if (previous) require.cache[electronModule] = previous; else delete require.cache[electronModule];
  }
});
