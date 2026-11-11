import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { RecordExitInspection } from "../../../application/use-cases/RecordExitInspection";
import { RecordEntryInspection } from "../../../application/use-cases/RecordEntryInspection";
import { GetInspection } from "../../../application/use-cases/GetInspection";
import { ListInspections } from "../../../application/use-cases/ListInspections";
import { ReleaseRentalKeys } from "../../../application/use-cases/ReleaseRentalKeys";
import { CancelRental } from "../../../application/use-cases/CancelRental";
import { IFileStorage } from "../../../domain/repositories/IFileStorage";
import { Inspection, InspectionMedia } from "../../../domain/entities/Inspection";
import {
  sqlite,
  inspections,
  properties,
  history,
  storage,
  input,
  storageDir,
  photo,
  video,
  temp,
  copiedFiles,
  DrizzleInspectionRepository,
} from "./inspectionTestSetup";

const recordExit = new RecordExitInspection(inspections, properties, history, storage);
const recordEntry = new RecordEntryInspection(inspections, properties, history, storage);
const get = new GetInspection(inspections);
const list = new ListInspections(inspections, properties, history);

describe("HU08 exit inspection and RN03 enforcement", () => {
  it("persists an exit inspection linked to its contract with copied photo and video", async () => {
    const result = await recordExit.execute(input());
    assert.equal(result.type, "EXIT");
    assert.equal(result.contractId, "contract");
    assert.deepEqual(result.media.map((item) => item.type), ["IMAGE", "VIDEO"]);
    assert.deepEqual(result.media.map((item) => item.mimeType), ["image/jpeg", "video/webm"]);

    for (const media of result.media) {
      assert.equal(media.inspectionId, result.id);
      assert.ok(media.filePath.startsWith(path.join(storageDir, "media", "inspections", result.id)));
      assert.ok(media.size > 0);
      assert.deepEqual(await fs.readFile(media.filePath), await fs.readFile(media.type === "IMAGE" ? photo : video));
    }

    const fetched = await get.execute(result.id);
    assert.equal(fetched.type, "EXIT");
    assert.deepEqual(fetched.media.map((m) => m.id).sort(), result.media.map((m) => m.id).sort());
  });

  it("lists exit inspections properly under property or contract", async () => {
    const result = await recordExit.execute(input());
    const propertyInspections = await list.execute({ propertyId: "property" });
    assert.ok(propertyInspections.some((i) => i.id === result.id && i.type === "EXIT"));

    const contractInspections = await list.execute({ contractId: "contract" });
    assert.ok(contractInspections.some((i) => i.id === result.id && i.type === "EXIT"));
  });

  it("rejects missing properties, mismatched contracts and cancelled contracts", async () => {
    await assert.rejects(recordExit.execute({ ...input(), propertyId: "missing" }), /Imóvel não encontrado/);
    await assert.rejects(recordExit.execute({ ...input(), contractId: "missing" }), /contrato/);
    await assert.rejects(recordExit.execute({ ...input(), contractId: "other-contract" }), /contrato/);

    await sqlite.execute("UPDATE property_contracts SET status = 'CANCELLED' WHERE id = 'contract'");
    await assert.rejects(recordExit.execute(input()), /cancelado/);
    assert.deepEqual(await copiedFiles(), []);
  });

  it("validates dates, description and invalid file inputs", async () => {
    for (const inspectedAt of [-1, 1.5, NaN, Infinity, Date.now() + 86400000]) {
      await assert.rejects(recordExit.execute({ ...input(), inspectedAt }));
    }
    await assert.rejects(recordExit.execute({ ...input(), description: "   " }));
    await assert.rejects(recordExit.execute({ ...input(), contractId: "" }));
    await assert.rejects(recordExit.execute({ ...input(), sourceFilePaths: [null as unknown as string] }));

    const invalidExt = path.join(temp, "arquivo.pdf");
    await fs.writeFile(invalidExt, "pdf content");
    await assert.rejects(recordExit.execute({ ...input(), sourceFilePaths: [invalidExt] }), /Formato inválido/);
  });

  it("rolls back inspection and copied files if a media insert fails", async () => {
    const failing = new (class extends DrizzleInspectionRepository {
      async create(inspection: Inspection, media: InspectionMedia[]) {
        return super.create(inspection, media.map((item) => ({ ...item, inspectionId: "missing" })));
      }
    })();
    await assert.rejects(new RecordExitInspection(failing, properties, history, storage).execute(input()));
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM property_inspections")).rows[0].n, 0);
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM inspection_media")).rows[0].n, 0);
    assert.deepEqual(await copiedFiles(), []);
  });

  it("cleans partial copies when a later file copy fails", async () => {
    let copies = 0;
    const failingStorage: IFileStorage = {
      ...storage,
      save: async (source, dir, name) => {
        const result = await storage.save(source, dir, name);
        if (++copies === 2) throw new Error("Disk full");
        return result;
      },
    };
    await assert.rejects(
      new RecordExitInspection(inspections, properties, history, failingStorage).execute(input()),
      /Disk full/
    );
    assert.deepEqual(await copiedFiles(), []);
    assert.equal((await sqlite.execute("SELECT count(*) AS n FROM property_inspections")).rows[0].n, 0);
  });

  it("RN03: enforces mandatory entry inspection before releasing keys", async () => {
    // Setup a rental linked to the contract
    await sqlite.executeMultiple(`
      INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, due_day, contract_signed, signatures_notarized, initial_payments_paid, keys_released_at, created_at, updated_at)
      VALUES ('rental-1', 'property', 'tenant', 1000, 1, 10, 1, 1, 1, NULL, 1, 1);
      UPDATE property_contracts SET rental_id = 'rental-1' WHERE id = 'contract';
    `);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DrizzleRentalRepository } = require("../DrizzleRentalRepository");
    const rentalRepo = new DrizzleRentalRepository();
    const releaseKeys = new ReleaseRentalKeys(rentalRepo, inspections, history);

    // Attempting to release keys without entry inspection must throw RN03
    await assert.rejects(
      releaseKeys.execute("rental-1"),
      /RN03: A vistoria de entrada é obrigatória para a entrega das chaves/
    );

    // Now record an entry inspection
    await recordEntry.execute(input());

    // Releasing keys should now succeed
    const updatedRental = await releaseKeys.execute("rental-1");
    assert.ok(updatedRental.keysReleasedAt);
  });

  it("RN03: enforces mandatory exit inspection before ending/cancelling an occupied rental", async () => {
    // Setup a rental where keys were released
    await sqlite.executeMultiple(`
      INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, due_day, contract_signed, signatures_notarized, initial_payments_paid, keys_released_at, created_at, updated_at)
      VALUES ('rental-2', 'property', 'tenant', 1000, 1, 10, 1, 1, 1, 1000, 1, 1);
      UPDATE property_contracts SET rental_id = 'rental-2' WHERE id = 'contract';
    `);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DrizzleRentalRepository } = require("../DrizzleRentalRepository");
    const rentalRepo = new DrizzleRentalRepository();
    const cancelRental = new CancelRental(rentalRepo, inspections, history);

    // Attempting to cancel rental without exit inspection must throw RN03
    await assert.rejects(
      cancelRental.execute("rental-2"),
      /RN03: A vistoria de saída é obrigatória para o encerramento da locação/
    );

    // Record an exit inspection
    await recordExit.execute(input());

    // Cancelling rental should now succeed
    await cancelRental.execute("rental-2");
    assert.equal(await rentalRepo.findById("rental-2"), null);
    const contract = (await sqlite.execute("SELECT status FROM property_contracts WHERE id = 'contract'")).rows[0];
    assert.equal(contract.status, "ENDED");
  });

  it("RN03: allows cancelling rental without exit inspection if keys were never released", async () => {
    await sqlite.executeMultiple(`
      INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, due_day, contract_signed, signatures_notarized, initial_payments_paid, keys_released_at, created_at, updated_at)
      VALUES ('rental-unreleased', 'property', 'tenant', 1000, 1, 10, 0, 0, 0, NULL, 1, 1);
      UPDATE property_contracts SET rental_id = 'rental-unreleased' WHERE id = 'contract';
    `);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DrizzleRentalRepository } = require("../DrizzleRentalRepository");
    const rentalRepo = new DrizzleRentalRepository();
    const cancelRental = new CancelRental(rentalRepo, inspections, history);

    // Cancelling without keys released does not require exit inspection
    await cancelRental.execute("rental-unreleased");
    assert.equal(await rentalRepo.findById("rental-unreleased"), null);
  });
});

it("registers only the exit recording IPC handler", async () => {
  const electronModule = require.resolve("electron");
  const previous = require.cache[electronModule];
  const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
  require.cache[electronModule] = {
    exports: {
      ipcMain: {
        handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) =>
          handlers.set(name, handler),
      },
      app: { getPath: () => storageDir },
    },
  } as NodeModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
    require("../../../ipc/inspection-exit.ipc").registerInspectionExitIpc();
    assert.deepEqual([...handlers.keys()], ["inspections:record-exit"]);
    const exit = (await handlers.get("inspections:record-exit")({}, input())) as { id: string };
    assert.equal((await get.execute(exit.id)).contractId, "contract");
    assert.equal((await get.execute(exit.id)).type, "EXIT");
  } finally {
    if (previous) require.cache[electronModule] = previous;
    else delete require.cache[electronModule];
  }
});
