import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { RegisterUser } from "../../../application/use-cases/auth/register-user.use-case";
import { LoginUser } from "../../../application/use-cases/auth/login-user.use-case";
import { BcryptPasswordHasher } from "../../security/bcrypt-password-hasher";

const sqlite = createClient({ url: "file::memory:" });
const databaseModule = require.resolve("../../database/db");
const previousModule = require.cache[databaseModule];
require.cache[databaseModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate the test database
const { DrizzleUserRepository } = require("../drizzle-user.repository") as typeof import("../drizzle-user.repository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate the test database
const { DrizzleSessionRepository } = require("../drizzle-session.repository") as typeof import("../drizzle-session.repository");
const users = new DrizzleUserRepository();
const sessions = new DrizzleSessionRepository();
const hasher = new BcryptPasswordHasher();
const register = new RegisterUser(users, hasher);
const login = new LoginUser(users, hasher, sessions);
after(() => {
  sqlite.close();
  if (previousModule) require.cache[databaseModule] = previousModule;
  else delete require.cache[databaseModule];
});

describe("authentication database compatibility", () => {
  it("registers and logs in on a fresh database", async () => {
    await initializeDatabase(sqlite);
    const user = await register.execute({ nome: "Corretor", email: "novo@example.com", senha: "senha123", perguntaSeguranca: "Pet?", respostaSeguranca: "Rex" });
    const session = await login.execute({ email: user.email, senha: "senha123" });
    assert.equal(session.userId, user.id);
    const stored = await users.findById(user.id);
    assert.equal(stored?.perguntaSeguranca, "Pet?");
    assert.ok(stored?.respostaHash);
    assert.ok(await hasher.compare("rex", stored.respostaHash));
  });

  it("upgrades legacy accounts without losing passwords or sessions", async () => {
    await sqlite.executeMultiple("DROP TABLE sessions; DROP TABLE users; CREATE TABLE users (id TEXT PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL, criado_em INTEGER NOT NULL, atualizado_em INTEGER NOT NULL);");
    const passwordHash = await hasher.hash("antiga123");
    await sqlite.execute({ sql: "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)", args: ["legacy", "Antigo", "antigo@example.com", passwordHash, 1, 1] });
    await initializeDatabase(sqlite);
    const session = await login.execute({ email: "antigo@example.com", senha: "antiga123" });
    await initializeDatabase(sqlite);
    const stored = await users.findById("legacy");
    assert.equal(stored?.senhaHash, passwordHash);
    assert.equal(stored?.perguntaSeguranca, null);
    assert.equal(stored?.respostaHash, null);
    assert.equal((await sessions.findById(session.id))?.userId, "legacy");
    assert.equal(await users.count(), 1);
  });

  it("preserves configured recovery data on repeated initialization", async () => {
    const user = await register.execute({ nome: "Novo", email: "recuperacao@example.com", senha: "senha123", perguntaSeguranca: "Pet?", respostaSeguranca: "Rex" });
    const before = await users.findById(user.id);
    await initializeDatabase(sqlite);
    assert.deepEqual(await users.findById(user.id), before);
  });
});
