import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { CreateProperty } from "../../../application/use-cases/CreateProperty";
import { UpdateProperty } from "../../../application/use-cases/UpdateProperty";
import { SearchProperties } from "../../../application/use-cases/SearchProperties";
const sqlite = createClient({ url: "file::memory:" });
const modulePath = require.resolve("../../database/db");
const previousModule = require.cache[modulePath];
require.cache[modulePath] = { exports: { db: drizzle(sqlite) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- inject an isolated SQLite database
const { DrizzlePropertyRepository } = require("../DrizzlePropertyRepository") as typeof import("../DrizzlePropertyRepository");
const repo = new DrizzlePropertyRepository();
const create = new CreateProperty(repo);
const update = new UpdateProperty(repo);
const search = new SearchProperties(repo);
const data = { title: "Casa São José", address: "Rua A", price: 1000 };
before(() => initializeDatabase(sqlite));
after(() => {
  sqlite.close();
  if (previousModule) require.cache[modulePath] = previousModule;
  else delete require.cache[modulePath];
});
describe("property search persistence and validation", () => {
  for (const bedrooms of [-1, 1.5, NaN, Infinity, "2", true]) {
    it(`rejects invalid bedrooms on create and update: ${String(bedrooms)}`, async () => {
      const invalid = bedrooms as number;
      const countBefore = (await repo.findAll()).length;
      await assert.rejects(create.execute({ ...data, bedrooms: invalid }), /non-negative integer/);
      assert.equal((await repo.findAll()).length, countBefore);
      const property = await create.execute({ ...data, bedrooms: 2 });
      await assert.rejects(update.execute({ id: property.id, title: "Changed", bedrooms: invalid }), /non-negative integer/);
      assert.equal((await repo.findById(property.id))?.bedrooms, 2);
      assert.equal((await repo.findById(property.id))?.title, data.title);
    });
  }
  it("returns structured Zod validation issues from the search IPC", async () => {
    const electronModule = require.resolve("electron");
    const previousElectron = require.cache[electronModule];
    const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
    require.cache[electronModule] = { exports: { ipcMain: { handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) => handlers.set(name, handler) } } } as NodeModule;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
      const { registerPropertiesIpc } = require("../../../ipc/properties.ipc") as typeof import("../../../ipc/properties.ipc");
      registerPropertiesIpc();
      const handler = handlers.get("properties:search");
      assert.ok(handler);
      const result = await handler({}, { page: 1.5 }) as { error: boolean; details: { path: string[] }[] };
      assert.equal(result.error, true);
      assert.ok(result.details.some(issue => issue.path[0] === "page"));
    } finally {
      if (previousElectron) require.cache[electronModule] = previousElectron;
      else delete require.cache[electronModule];
    }
  });
  it("accepts zero bedrooms and keeps omitted bedrooms unchanged on update", async () => {
    const property = await create.execute({ ...data, bedrooms: 0 });
    assert.equal((await repo.findById(property.id))?.bedrooms, 0);
    await update.execute({ id: property.id, title: "Updated" });
    assert.equal((await repo.findById(property.id))?.bedrooms, 0);
    assert.equal((await create.execute(data)).bedrooms, null);
  });
  it("backfills existing null search text even when the column already exists", async () => {
    const property = await create.execute({ ...data, neighborhood: "José Bonifácio" });
    await sqlite.execute({ sql: "UPDATE properties SET search_normalized = NULL WHERE id = ?", args: [property.id] });
    await initializeDatabase(sqlite);
    await initializeDatabase(sqlite);
    const result = await search.execute({ q: "sao bonifacio" });
    assert.ok(result.items.some(item => item.id === property.id));
    assert.equal((await repo.findById(property.id))?.title, data.title);
  });
  it("upgrades a legacy database without losing properties", async () => {
    const old = createClient({ url: "file::memory:" });
    try {
      await old.executeMultiple(fs.readFileSync(path.join(process.cwd(), "src/main/infrastructure/database/migrations/0000_quick_galactus.sql"), "utf8"));
      await old.execute("INSERT INTO properties (id,title,address,price,status,created_at,updated_at) VALUES ('old','São José','Rua',10,'CADASTRADO',1,1)");
      await initializeDatabase(old);
      await initializeDatabase(old);
      const row = (await old.execute("SELECT * FROM properties WHERE id = 'old'")).rows[0];
      assert.equal(row.title, "São José");
      assert.match(String(row.search_normalized), /sao jose/);
      assert.equal(row.bedrooms, null);
    } finally { old.close(); }
  });
  it("maintains normalized search text after editing a property", async () => {
    const property = await create.execute({ ...data, title: "Original única" });
    await update.execute({ id: property.id, title: "Título exclusivo", neighborhood: "Água" });
    const result = await search.execute({ q: "titulo agua" });
    assert.ok(result.items.some(item => item.id === property.id));
    assert.equal((await search.execute({ q: "original unica" })).total, 0);
  });
  it("persists the neighborhood sent by the existing screen through IPC on create and edit", async () => {
    const electronModule = require.resolve("electron");
    const previousElectron = require.cache[electronModule];
    const ipcModule = require.resolve("../../../ipc/properties.ipc");
    const previousIpc = require.cache[ipcModule];
    delete require.cache[ipcModule];
    const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
    require.cache[electronModule] = { exports: { ipcMain: { handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) => handlers.set(name, handler) } } } as NodeModule;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
      const { registerPropertiesIpc } = require("../../../ipc/properties.ipc") as typeof import("../../../ipc/properties.ipc");
      registerPropertiesIpc();
      const createHandler = handlers.get("properties:create");
      const updateHandler = handlers.get("properties:update");
      assert.ok(createHandler && updateHandler);
      const property = await createHandler({}, { ...data, bairro: "Bairro exclusivo" }) as { id: string };
      assert.equal((await repo.findById(property.id))?.neighborhood, "Bairro exclusivo");
      assert.ok((await search.execute({ neighborhood: "Bairro exclusivo" })).items.some(item => item.id === property.id));
      await updateHandler({}, { id: property.id, bairro: "Bairro editado" });
      assert.equal((await repo.findById(property.id))?.neighborhood, "Bairro editado");
      assert.ok((await search.execute({ q: "bairro editado" })).items.some(item => item.id === property.id));
      await updateHandler({}, { id: property.id, title: "Outro título" });
      assert.equal((await repo.findById(property.id))?.neighborhood, "Bairro editado");
      await updateHandler({}, { id: property.id, neighborhood: "Campo oficial", bairro: "Não usar" });
      assert.equal((await repo.findById(property.id))?.neighborhood, "Campo oficial");
    } finally {
      if (previousIpc) require.cache[ipcModule] = previousIpc;
      else delete require.cache[ipcModule];
      if (previousElectron) require.cache[electronModule] = previousElectron;
      else delete require.cache[electronModule];
    }
  });

});
