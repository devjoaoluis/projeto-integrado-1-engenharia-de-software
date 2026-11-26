import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { GetPropertyOverview } from "../../../application/use-cases/GetPropertyOverview";
import { RecordPropertyHistory } from "../../../application/use-cases/RecordPropertyHistory";
import { DeleteProperty } from "../../../application/use-cases/DeleteProperty";
import { IFileStorage } from "../../../domain/repositories/IFileStorage";
import { initializeDatabase } from "../../database/initializeDatabase";

const client = createClient({ url: "file::memory:" });
const moduleId = require.resolve("../../database/db");
const previousModule = require.cache[moduleId];
require.cache[moduleId] = { exports: { db: drizzle(client) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- use the isolated test database
const { DrizzlePropertyHistoryRepository } = require("../DrizzlePropertyHistoryRepository") as typeof import("../DrizzlePropertyHistoryRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- use the isolated test database
const { DrizzlePropertyRepository } = require("../DrizzlePropertyRepository") as typeof import("../DrizzlePropertyRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- use the isolated test database
const { DrizzlePropertyMediaRepository } = require("../DrizzlePropertyMediaRepository") as typeof import("../DrizzlePropertyMediaRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- use the isolated test database
const { DrizzleClientRepository } = require("../DrizzleClientRepository") as typeof import("../DrizzleClientRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- use the isolated test database
const { DrizzleRentalRepository } = require("../DrizzleRentalRepository") as typeof import("../DrizzleRentalRepository");
const historyRepo = new DrizzlePropertyHistoryRepository();
const propertyRepo = new DrizzlePropertyRepository();
const mediaRepo = new DrizzlePropertyMediaRepository();
const rentalRepo = new DrizzleRentalRepository();
const overview = new GetPropertyOverview(propertyRepo, mediaRepo, historyRepo);
const record = new RecordPropertyHistory(historyRepo, propertyRepo, new DrizzleClientRepository(), rentalRepo);
const now = Date.now();

function contractData(propertyId = "property") {
  return { propertyId, tenantId: "tenant", rentalId: null as string | null, reference: "contrato.pdf",
    monthlyRent: 1000, startDate: now - 10000, endDate: null as number | null, status: "ACTIVE" as const };
}

before(async () => {
  await client.execute("PRAGMA foreign_keys = ON");
  const migrations = path.join(process.cwd(), "src/main/infrastructure/database/migrations");
  const journal = JSON.parse(fs.readFileSync(path.join(migrations, "meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
  for (const entry of journal.entries) await client.executeMultiple(fs.readFileSync(path.join(migrations, entry.tag + ".sql"), "utf8"));
});
beforeEach(async () => {
  await client.executeMultiple(`DELETE FROM property_payments; DELETE FROM property_contracts;
    DELETE FROM property_inspections; DELETE FROM property_maintenances;
    DELETE FROM rentals; DELETE FROM property_media; DELETE FROM properties; DELETE FROM clients;
    INSERT INTO properties (id, title, address, description, price, status, created_at, updated_at) VALUES ('property', 'Casa', 'Rua', 'Descrição', 1000, 'DISPONIVEL', 1, 1);
    INSERT INTO properties (id, title, address, description, price, status, created_at, updated_at) VALUES ('other', 'Outra casa', 'Outra rua', NULL, 1000, 'DISPONIVEL', 1, 1);
    INSERT INTO clients (id, name, cpf_cnpj, phone, email, created_at, updated_at) VALUES ('tenant', 'Cliente', '123', '9999', NULL, 1, 1);`);
});
after(() => {
  client.close();
  if (previousModule) require.cache[moduleId] = previousModule;
  else delete require.cache[moduleId];
});

describe("HU05 property overview", () => {
  it("returns registered property data and genuinely empty histories", async () => {
    const result = await overview.execute("property");
    assert.equal(result.property.title, "Casa");
    assert.equal(result.property.description, "Descrição");
    assert.deepEqual(result.contracts, { current: [], previous: [], scheduled: [] });
    assert.deepEqual(result.payments, []);
    assert.deepEqual(result.inspections, []);
    assert.deepEqual(result.maintenances, []);
  });
  it("rejects missing and invalid property ids", async () => {
    await assert.rejects(overview.execute("missing"), /not found/);
    await assert.rejects(overview.execute("  "), /required/);
    await assert.rejects(overview.execute(null as unknown as string), /required/);
  });
  it("separates current, expired, ended, cancelled and scheduled contracts", async () => {
    const current = await record.execute({ type: "CONTRACT", data: contractData() });
    const expired = await record.execute({ type: "CONTRACT", data: { ...contractData(), endDate: now - 1000 } });
    const ended = await record.execute({ type: "CONTRACT", data: { ...contractData(), endDate: now - 1000, status: "ENDED" } });
    const cancelled = await record.execute({ type: "CONTRACT", data: { ...contractData(), status: "CANCELLED" } });
    const future = await record.execute({ type: "CONTRACT", data: { ...contractData(), startDate: now + 86400000 } });
    assert.ok(current && expired && ended && cancelled && future);
    const result = await overview.execute("property");
    assert.deepEqual(result.contracts.current.map(value => value.id), [current.id]);
    assert.deepEqual(new Set(result.contracts.previous.map(value => value.id)), new Set([expired.id, ended.id, cancelled.id]));
    assert.deepEqual(result.contracts.scheduled.map(value => value.id), [future.id]);
  });
  it("consolidates histories in descending date order", async () => {
    const contract = await record.execute({ type: "CONTRACT", data: contractData() });
    assert.ok(contract);
    for (const date of [now - 5000, now - 1000]) {
      await record.execute({ type: "PAYMENT", data: { propertyId: "property", contractId: contract.id, amount: 1000, paidAt: date, description: "Aluguel" } });
      await record.execute({ type: "INSPECTION", data: { propertyId: "property", inspectedAt: date, description: "Vistoria", reportReference: null } });
      await record.execute({ type: "MAINTENANCE", data: { propertyId: "property", performedAt: date, description: "Pintura", cost: 0, status: "COMPLETED" } });
    }
    const result = await overview.execute("property");
    assert.deepEqual(result.payments.map(value => value.paidAt), [now - 1000, now - 5000]);
    assert.deepEqual(result.inspections.map(value => value.inspectedAt), [now - 1000, now - 5000]);
    assert.deepEqual(result.maintenances.map(value => value.performedAt), [now - 1000, now - 5000]);
    assert.equal(result.payments[0].contractId, contract.id);
  });
  it("does not include records from another property", async () => {
    const otherContract = await record.execute({ type: "CONTRACT", data: contractData("other") });
    assert.ok(otherContract);
    await record.execute({ type: "PAYMENT", data: { propertyId: "other", contractId: otherContract.id, amount: 10, paidAt: now, description: "Pagamento" } });
    await record.execute({ type: "INSPECTION", data: { propertyId: "other", inspectedAt: now, description: "Vistoria", reportReference: null } });
    await record.execute({ type: "MAINTENANCE", data: { propertyId: "other", performedAt: now, description: "Pintura", cost: null, status: "PENDING" } });
    const result = await overview.execute("property");
    assert.equal(result.contracts.current.length + result.contracts.previous.length + result.contracts.scheduled.length, 0);
    assert.equal(result.payments.length + result.inspections.length + result.maintenances.length, 0);
  });
  it("prevents payments being linked to another property's contract", async () => {
    const other = await record.execute({ type: "CONTRACT", data: contractData("other") });
    assert.ok(other);
    await assert.rejects(record.execute({ type: "PAYMENT", data: { propertyId: "property", contractId: other.id, amount: 10, paidAt: now, description: "Pagamento" } }), /must belong/);
    await assert.rejects(client.execute({ sql: "INSERT INTO property_payments VALUES (?, ?, ?, ?, ?, ?, ?)", args: ["bad", "property", other.id, 10, now, "Pagamento", now] }), /FOREIGN KEY/);
  });
  it("validates contract amounts, dates, tenant and linked rental", async () => {
    for (const monthlyRent of [0, -1, NaN, Infinity]) await assert.rejects(record.execute({ type: "CONTRACT", data: { ...contractData(), monthlyRent } }), /positive/);
    await assert.rejects(record.execute({ type: "CONTRACT", data: { ...contractData(), endDate: now - 20000 } }), /after start/);
    await assert.rejects(record.execute({ type: "CONTRACT", data: { ...contractData(), tenantId: "missing" } }), /Tenant/);
    await assert.rejects(record.execute({ type: "CONTRACT", data: { ...contractData(), rentalId: "missing" } }), /same property/);
    await assert.rejects(record.execute({ type: "CONTRACT", data: { ...contractData(), status: "ENDED" } }), /past end/);
  });
  it("rejects invalid history inputs without saving records", async () => {
    await assert.rejects(record.execute(null as unknown as Parameters<typeof record.execute>[0]), /valid history/);
    await assert.rejects(record.execute({ type: "INSPECTION", data: { propertyId: "missing", inspectedAt: now, description: "Vistoria", reportReference: null } }), /not found/);
    await assert.rejects(record.execute({ type: "INSPECTION", data: { propertyId: "property", inspectedAt: now + 86400000, description: "Vistoria", reportReference: null } }), /future/);
    await assert.rejects(record.execute({ type: "MAINTENANCE", data: { propertyId: "property", performedAt: now, description: " ", cost: null, status: "PENDING" } }), /Description/);
    await assert.rejects(record.execute({ type: "MAINTENANCE", data: { propertyId: "property", performedAt: now, description: "Pintura", cost: -1, status: "PENDING" } }), /nonnegative/);
    assert.deepEqual(await historyRepo.findByPropertyId("property"), { contracts: [], payments: [], inspections: [], maintenances: [] });
  });
  it("preserves server-generated identity against caller-supplied fields", async () => {
    const data = { propertyId: "property", inspectedAt: now, description: "Vistoria", reportReference: null as string | null, id: "attacker", createdAt: 0 };
    const result = await record.execute({ type: "INSPECTION", data });
    assert.ok(result);
    assert.notEqual(result.id, "attacker");
    assert.notEqual(result.createdAt, 0);
  });
  it("includes the property's media", async () => {
    await client.execute("INSERT INTO property_media VALUES ('photo', 'property', 'IMAGE', 'casa.jpg', '/tmp/casa.jpg', 'image/jpeg', 10, 1)");
    assert.equal((await overview.execute("property")).media[0].id, "photo");
  });
  it("preserves history and media when property deletion is attempted", async () => {
    await record.execute({ type: "INSPECTION", data: { propertyId: "property", inspectedAt: now, description: "Vistoria", reportReference: null } });
    await client.execute("INSERT INTO property_media VALUES ('photo', 'property', 'IMAGE', 'casa.jpg', '/tmp/casa.jpg', 'image/jpeg', 10, 1)");
    let deletedFiles = 0;
    const storage: IFileStorage = {
      delete: async () => { deletedFiles++; },
      save: async (_source, directory, name) => path.join(directory, name),
      exists: async () => true,
      getPath: (directory, name) => path.join(directory, name),
    };
    await assert.rejects(new DeleteProperty(propertyRepo, mediaRepo, storage, historyRepo).execute("property"), /histórico/);
    assert.equal(deletedFiles, 0);
    assert.equal((await mediaRepo.findByPropertyId("property")).length, 1);
    await assert.rejects(client.execute("DELETE FROM properties WHERE id = 'property'"), /FOREIGN KEY/);
  });
  it("upgrades an existing database and preserves its data", async () => {
    const old = createClient({ url: "file::memory:" });
    try {
      await old.execute("CREATE TABLE properties (id TEXT PRIMARY KEY, title TEXT NOT NULL, address TEXT NOT NULL, description TEXT, price REAL NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)");
      await old.execute("INSERT INTO properties (id, title, address, description, price, status, created_at, updated_at) VALUES ('old', 'Casa antiga', 'Rua', NULL, 10, 'CADASTRADO', 1, 1)");
      await initializeDatabase(old);
      await initializeDatabase(old);
      assert.equal((await old.execute("SELECT title FROM properties WHERE id = 'old'")).rows[0].title, "Casa antiga");
      assert.equal((await old.execute("SELECT count(*) AS total FROM property_contracts")).rows[0].total, 0);
    } finally { old.close(); }
  });
});
