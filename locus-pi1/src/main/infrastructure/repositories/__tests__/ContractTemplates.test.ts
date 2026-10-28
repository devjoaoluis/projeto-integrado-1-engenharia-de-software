import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { CreateContractTemplate } from "../../../application/use-cases/CreateContractTemplate";
import { GetContractTemplate } from "../../../application/use-cases/GetContractTemplate";
import { ListContractTemplates } from "../../../application/use-cases/ListContractTemplates";
const sqlite = createClient({ url: "file::memory:" });
const dbModule = require.resolve("../../database/db");
const previousDb = require.cache[dbModule];
require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- use an isolated SQLite database
const { DrizzleContractTemplateRepository } = require("../DrizzleContractTemplateRepository") as typeof import("../DrizzleContractTemplateRepository");
const repository = new DrizzleContractTemplateRepository();
const createTemplate = new CreateContractTemplate(repository);
const getTemplate = new GetContractTemplate(repository);
const listTemplates = new ListContractTemplates(repository);
before(() => initializeDatabase(sqlite));
beforeEach(async () => { await sqlite.execute("DELETE FROM contract_templates"); });
after(() => { sqlite.close(); if (previousDb) require.cache[dbModule] = previousDb; else delete require.cache[dbModule]; });
describe("HU11 predefined contract template registry", () => {
  it("starts empty without inserting invented legal text", async () => {
    assert.deepEqual(await listTemplates.execute(), []);
  });
  it("stores and reads supplied text, whitespace and placeholders without automatic filling", async () => {
    const content = "  CONTRATO\nLocatário: {{locatario.nome}}\nImóvel: {{imovel.endereco}}\n";
    const created = await createTemplate.execute({ name: "  Residencial  ", content });
    assert.equal(created.name, "Residencial"); assert.equal(created.content, content);
    assert.ok(created.id); assert.ok(created.createdAt > 0);
    assert.deepEqual(await getTemplate.execute(created.id), created);
    assert.deepEqual(await listTemplates.execute(), [created]);
  });
  it("rejects empty or invalid template data and caller-supplied identity", async () => {
    for (const data of [{ name: " ", content: "Texto" }, { name: "Modelo", content: "\n " },
      { name: "Modelo", content: 123 }, { name: "Modelo", content: "Texto", id: "caller-id" }, null]) {
      await assert.rejects(createTemplate.execute(data as Parameters<typeof createTemplate.execute>[0]));
    }
    assert.deepEqual(await listTemplates.execute(), []);
    await assert.rejects(getTemplate.execute("missing"), /não encontrado/);
    await assert.rejects(getTemplate.execute(" "), /required/);
  });
});


it("registers template create/get/list IPC without filling or PDF handlers", async () => {
  const electronModule = require.resolve("electron");
  const previous = require.cache[electronModule];
  const handlers = new Map<string, (event: unknown, data?: unknown) => Promise<unknown>>();
  require.cache[electronModule] = { exports: { ipcMain: { handle: (name: string, handler: (event: unknown, data?: unknown) => Promise<unknown>) => handlers.set(name, handler) } } } as NodeModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
    require("../../../ipc/contract-templates.ipc").registerContractTemplatesIpc();
    assert.deepEqual([...handlers.keys()], ["contract-templates:create", "contract-templates:get", "contract-templates:list"]);
    const entry = await handlers.get("contract-templates:create")({}, { name: "Modelo IPC", content: "Texto" }) as { id: string };
    assert.equal((await handlers.get("contract-templates:get")({}, entry.id) as { content: string }).content, "Texto");
    assert.equal((await handlers.get("contract-templates:list")({}) as unknown[]).length, 1);
    await initializeDatabase(sqlite);
    assert.equal((await getTemplate.execute(entry.id)).content, "Texto");
  } finally {
    if (previous) require.cache[electronModule] = previous; else delete require.cache[electronModule];
  }
});
