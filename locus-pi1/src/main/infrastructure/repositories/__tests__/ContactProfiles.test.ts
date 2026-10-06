import { before, beforeEach, after, describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { CreateContact } from "../../../application/use-cases/CreateContact";
import { UpdateContact } from "../../../application/use-cases/UpdateContact";
import { GetContact } from "../../../application/use-cases/GetContact";
import { ListContacts } from "../../../application/use-cases/ListContacts";
import { DeleteContact } from "../../../application/use-cases/DeleteContact";
import { CreateClient } from "../../../application/use-cases/CreateClient";
import { UpdateClient } from "../../../application/use-cases/UpdateClient";
import { GetClientProfile } from "../../../application/use-cases/GetClientProfile";
import { ClientType } from "../../../domain/entities/Client";

const sqlite = createClient({ url: "file::memory:" });
const databaseModule = require.resolve("../../database/db");
const previousModule = require.cache[databaseModule];
require.cache[databaseModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- inject the isolated database before loading repositories
const { DrizzleOwnerRepository } = require("../DrizzleOwnerRepository") as typeof import("../DrizzleOwnerRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- inject the isolated database before loading repositories
const { DrizzleGuarantorRepository } = require("../DrizzleGuarantorRepository") as typeof import("../DrizzleGuarantorRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- inject the isolated database before loading repositories
const { DrizzleClientRepository } = require("../DrizzleClientRepository") as typeof import("../DrizzleClientRepository");
const ownerRepo = new DrizzleOwnerRepository();
const guarantorRepo = new DrizzleGuarantorRepository();
const clientRepo = new DrizzleClientRepository();
const createClientUseCase = new CreateClient(clientRepo, guarantorRepo);
const updateClient = new UpdateClient(clientRepo, guarantorRepo);
const profile = new GetClientProfile(clientRepo, guarantorRepo);
const data = { name: "  Contato  ", cpfCnpj: "529.982.247-25", phone: "  (85) 99999-9999  ", email: "contato@example.com" };

before(async () => {
  await sqlite.execute("PRAGMA foreign_keys = ON");
  const migrations = path.join(process.cwd(), "src/main/infrastructure/database/migrations");
  const journal = JSON.parse(fs.readFileSync(path.join(migrations, "meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
  for (const entry of journal.entries) await sqlite.executeMultiple(fs.readFileSync(path.join(migrations, entry.tag + ".sql"), "utf8"));
});
beforeEach(async () => {
  await sqlite.executeMultiple("DELETE FROM clients; DELETE FROM owners; DELETE FROM guarantors;");
});
after(() => {
  sqlite.close();
  if (previousModule) require.cache[databaseModule] = previousModule;
  else delete require.cache[databaseModule];
});

function foreignKey(error: Error & { cause?: Error }) { return /FOREIGN KEY/.test(error.cause?.message ?? error.message); }

describe("HU02 client, owner and guarantor profiles", () => {
  for (const [label, repo] of [["owner", ownerRepo], ["guarantor", guarantorRepo]] as const) {
    it(`creates, lists, reads, edits and deletes an independent ${label}`, async () => {
      const created = await new CreateContact(repo).execute(data);
      assert.equal(created.name, "Contato");
      assert.equal(created.cpfCnpj, "52998224725");
      assert.equal(created.phone, "(85) 99999-9999");
      assert.equal((await new GetContact(repo).execute(created.id)).id, created.id);
      const updated = await new UpdateContact(repo).execute({ id: created.id, name: "Editado", email: null });
      assert.equal(updated.name, "Editado");
      assert.equal(updated.email, null);
      assert.equal(updated.createdAt, created.createdAt);
      assert.equal((await new ListContacts(repo).execute()).length, 1);
      await new DeleteContact(repo).execute(created.id);
      assert.equal((await new ListContacts(repo).execute()).length, 0);
    });
  }
  it("allows the same person in separate client and owner profiles", async () => {
    const owner = await new CreateContact(ownerRepo).execute(data);
    const client = await createClientUseCase.execute(data);
    assert.notEqual(owner.id, client.id);
    await new UpdateContact(ownerRepo).execute({ id: owner.id, name: "Proprietário" });
    assert.equal((await clientRepo.findById(client.id))?.name, "Contato");
    assert.equal((await ownerRepo.findAll()).length, 1);
    assert.equal((await clientRepo.findAll()).length, 1);
  });
  it("registers a tenant with guarantor and returns the complete profile", async () => {
    const guarantor = await new CreateContact(guarantorRepo).execute({ ...data, name: "Fiador" });
    const client = await createClientUseCase.execute({ ...data, cpfCnpj: "123.456.789-00", type: "TENANT", guarantorId: guarantor.id });
    const result = await profile.execute(client.id);
    assert.equal(result.client.type, "TENANT");
    assert.equal(result.client.guarantorId, guarantor.id);
    assert.equal(result.guarantor?.name, "Fiador");
  });
  it("defaults to interested and supports changing or clearing the guarantor", async () => {
    const client = await createClientUseCase.execute(data);
    assert.equal(client.type, "INTERESTED");
    assert.equal(client.guarantorId, null);
    const first = await new CreateContact(guarantorRepo).execute(data);
    const second = await new CreateContact(guarantorRepo).execute({ ...data, cpfCnpj: "12.345.678/0001-90" });
    await updateClient.execute({ id: client.id, guarantorId: first.id });
    await updateClient.execute({ id: client.id, guarantorId: second.id, type: "TENANT" });
    assert.equal((await profile.execute(client.id)).guarantor?.id, second.id);
    await updateClient.execute({ id: client.id, guarantorId: null, email: null });
    assert.equal((await profile.execute(client.id)).guarantor, null);
    assert.equal((await clientRepo.findById(client.id))?.email, null);
  });
  it("rejects nonexistent guarantors and invalid client types", async () => {
    await assert.rejects(createClientUseCase.execute({ ...data, guarantorId: "missing" }), /Guarantor not found/);
    await assert.rejects(createClientUseCase.execute({ ...data, type: "INVALID" as ClientType }), /Invalid client type/);
    const client = await createClientUseCase.execute(data);
    await assert.rejects(updateClient.execute({ id: client.id, guarantorId: "missing", name: "Changed" }), /Guarantor not found/);
    assert.equal((await clientRepo.findById(client.id))?.name, "Contato");
    await assert.rejects(profile.execute("missing"), /not found/);
  });
  it("blocks deleting a linked guarantor until the client is unlinked", async () => {
    const guarantor = await new CreateContact(guarantorRepo).execute(data);
    const client = await createClientUseCase.execute({ ...data, guarantorId: guarantor.id });
    const remove = new DeleteContact(guarantorRepo);
    await assert.rejects(remove.execute(guarantor.id), foreignKey);
    assert.ok(await guarantorRepo.findById(guarantor.id));
    await updateClient.execute({ id: client.id, guarantorId: null });
    await remove.execute(guarantor.id);
    assert.equal(await guarantorRepo.findById(guarantor.id), null);
  });
  it("rejects equivalent formatted CPF/CNPJ duplicates in each table", async () => {
    for (const repo of [ownerRepo, guarantorRepo]) {
      const create = new CreateContact(repo);
      await create.execute(data);
      await assert.rejects(create.execute({ ...data, cpfCnpj: "52998224725" }), /already exists/);
    }
    await createClientUseCase.execute(data);
    await assert.rejects(createClientUseCase.execute({ ...data, cpfCnpj: "52998224725" }), /already exists/);
  });
  it("validates required fields, document format and runtime types", async () => {
    const create = new CreateContact(ownerRepo);
    await assert.rejects(create.execute({ ...data, name: " " }), /Name/);
    await assert.rejects(create.execute({ ...data, phone: " " }), /Phone/);
    for (const cpfCnpj of ["123", "abc52998224725", "52998224725x"]) await assert.rejects(create.execute({ ...data, cpfCnpj }), /CPF/);
    await assert.rejects(create.execute({ ...data, email: 12 as unknown as string }), /Email/);
    await assert.rejects(new GetContact(ownerRepo).execute("missing"), /not found/);
    await assert.rejects(new UpdateContact(ownerRepo).execute({ id: "missing", name: "Editado" }), /not found/);
    await assert.rejects(new DeleteContact(ownerRepo).execute("missing"), /not found/);
  });
  it("prevents duplicate updates without persisting unrelated field changes", async () => {
    const create = new CreateContact(ownerRepo);
    const first = await create.execute(data);
    const second = await create.execute({ ...data, cpfCnpj: "12345678900" });
    await assert.rejects(new UpdateContact(ownerRepo).execute({ id: second.id, cpfCnpj: first.cpfCnpj, name: "Changed" }), /already exists/);
    assert.equal((await ownerRepo.findById(second.id))?.name, "Contato");
    const clientA = await createClientUseCase.execute(data);
    const clientB = await createClientUseCase.execute({ ...data, cpfCnpj: "12345678900" });
    await assert.rejects(updateClient.execute({ id: clientB.id, cpfCnpj: clientA.cpfCnpj }), /already exists/);
  });
  it("enforces document uniqueness under concurrent creation", async () => {
    const create = new CreateContact(ownerRepo);
    const results = await Promise.allSettled([create.execute(data), create.execute({ ...data, cpfCnpj: "52998224725" })]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await ownerRepo.findAll()).length, 1);
  });
  it("upgrades existing client records idempotently without losing identity", async () => {
    const old = createClient({ url: "file::memory:" });
    try {
      await old.execute("CREATE TABLE clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, cpf_cnpj TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, email TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)");
      await old.execute("INSERT INTO clients VALUES ('legacy', 'Cliente antigo', '529.982.247-25', '9999', NULL, 1, 1)");
      await initializeDatabase(old);
      await initializeDatabase(old);
      const result = (await old.execute("SELECT * FROM clients WHERE id = 'legacy'")).rows[0];
      assert.equal(result.id, "legacy");
      assert.equal(result.name, "Cliente antigo");
      assert.equal(result.cpf_cnpj, "52998224725");
      assert.equal(result.type, "INTERESTED");
      assert.equal(result.guarantor_id, null);
    } finally { old.close(); }
  });
});
