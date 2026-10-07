import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
const sqlite = createClient({ url: "file::memory:" });
const databaseModule = require.resolve("../../database/db");
const electronModule = require.resolve("electron");
const previousDatabase = require.cache[databaseModule];
const previousElectron = require.cache[electronModule];
type Handler = (event: unknown, data?: unknown) => Promise<unknown>;
const handlers = new Map<string, Handler>();
require.cache[databaseModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;
require.cache[electronModule] = { exports: { ipcMain: { handle: (name: string, handler: Handler) => handlers.set(name, handler) } } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron and SQLite before loading IPC
const { registerAuthIpc } = require("../../../ipc/auth.ipc") as typeof import("../../../ipc/auth.ipc");
type Response = { success?: boolean; error?: string; user?: Record<string, unknown> | null };
async function invoke(channel: string, data?: unknown): Promise<Response> {
  const handler = handlers.get(channel);
  assert.ok(handler);
  return await handler({}, data) as Response;
}
const account = { nome: "Marismar", email: "marismar@example.com", senha: "antiga123", perguntaSeguranca: "Pet?", respostaSeguranca: "Rex" };
before(async () => { await initializeDatabase(sqlite); registerAuthIpc(); });
beforeEach(async () => {
  await invoke("auth:logout");
  await sqlite.executeMultiple("DELETE FROM sessions; DELETE FROM users;");
  assert.equal((await invoke("auth:register", account)).success, true);
  assert.equal((await invoke("auth:login", account)).success, true);
});
after(() => {
  sqlite.close();
  for (const [key, previous] of [[databaseModule, previousDatabase], [electronModule, previousElectron]] as const) {
    if (previous) require.cache[key] = previous;
    else delete require.cache[key];
  }
});
describe("authentication security through IPC", () => {
  it("returns the current user without password or recovery hashes", async () => {
    const result = await invoke("auth:current-user");
    assert.equal(result.user?.nome, "Marismar");
    assert.ok(result.user);
    assert.equal(Object.hasOwn(result.user, "senhaHash"), false);
    assert.equal(Object.hasOwn(result.user, "respostaHash"), false);
  });
  it("rejects short passwords without changing the password or session", async () => {
    const result = await invoke("auth:reset-password", { email: account.email, resposta: "Rex", novaSenha: "x" });
    assert.equal(result.success, false);
    assert.match(result.error ?? "", /6 caracteres/);
    assert.ok((await invoke("auth:current-user")).user);
    assert.equal((await invoke("auth:login", account)).success, true);
  });
  it("rejects incorrect answers and preserves the session and password", async () => {
    assert.equal((await invoke("auth:reset-password", { email: account.email, respostaSeguranca: "errada", novaSenha: "nova123" })).success, false);
    assert.ok((await invoke("auth:current-user")).user);
    assert.equal((await invoke("auth:login", account)).success, true);
  });
  for (const answerField of ["resposta", "respostaSeguranca"]) {
    it(`resets using ${answerField}, normalizes input and invalidates every session`, async () => {
      await invoke("auth:login", account);
      assert.equal((await sqlite.execute("SELECT id FROM sessions")).rows.length, 2);
      assert.equal((await invoke("auth:reset-password", { email: " MARISMAR@EXAMPLE.COM ", [answerField]: " REX ", novaSenha: "nova123" })).success, true);
      assert.equal((await sqlite.execute("SELECT id FROM sessions")).rows.length, 0);
      assert.equal((await invoke("auth:current-user")).user, null);
      assert.equal((await invoke("auth:login", account)).success, false);
      assert.equal((await invoke("auth:login", { email: account.email, senha: "nova123" })).success, true);
    });
  }
  it("rejects malformed or blank inputs without ending the active session", async () => {
    for (const data of [undefined, null, {}, { email: 1, resposta: "Rex", novaSenha: "nova123" }, { email: account.email, resposta: "   ", novaSenha: "nova123" }]) {
      assert.equal((await invoke("auth:reset-password", data)).success, false);
    }
    assert.ok((await invoke("auth:current-user")).user);
  });
  it("preserves login for legacy accounts without recovery configured", async () => {
    await sqlite.execute("UPDATE users SET pergunta_seguranca = NULL, resposta_hash = NULL");
    assert.equal((await invoke("auth:get-security-question", account.email)).success, false);
    assert.equal((await invoke("auth:reset-password", { email: account.email, resposta: "Rex", novaSenha: "nova123" })).success, false);
    assert.equal((await invoke("auth:login", account)).success, true);
  });
});
