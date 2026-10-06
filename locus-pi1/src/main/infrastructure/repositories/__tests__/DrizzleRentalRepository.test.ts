import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "../../database/initializeDatabase";
import { drizzle } from "drizzle-orm/libsql";
import { PropertyStatus } from "../../../domain/entities/Property";
import { Rental } from "../../../domain/entities/Rental";

const sqlite = createClient({ url: "file::memory:" });
const migrations = path.join(process.cwd(), "src/main/infrastructure/database/migrations");
before(async () => {
  await sqlite.execute("PRAGMA foreign_keys = ON");
  for (const name of ["0000_quick_galactus.sql", "0001_add_clients.sql", "0002_add_auth.sql", "0003_add_rentals.sql"]) {
    await sqlite.executeMultiple(fs.readFileSync(path.join(migrations, name), "utf8"));
  }
});
// Inject an isolated real SQLite database without starting Electron.
const databaseModule = require.resolve("../../database/db");
const previousModule = require.cache[databaseModule];
require.cache[databaseModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- load after injecting the test database
const { DrizzleRentalRepository } = require("../DrizzleRentalRepository") as typeof import("../DrizzleRentalRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- load after injecting the test database
const { DrizzlePropertyRepository } = require("../DrizzlePropertyRepository") as typeof import("../DrizzlePropertyRepository");
const repo = new DrizzleRentalRepository();

function rental(id = "rental"): Rental {
  return { id, propertyId: "property", tenantId: "tenant", monthlyRent: 1000,
    startDate: 1, dueDay: 10, parentRentalId: null, formalConsent: null,
    contractSigned: false, signaturesNotarized: false, initialPaymentsPaid: false,
    keysReleasedAt: null, createdAt: 1, updatedAt: 2 };
}

beforeEach(async () => {
  await sqlite.executeMultiple(`DELETE FROM rentals WHERE parent_rental_id IS NOT NULL;
    DELETE FROM rentals; DELETE FROM properties; DELETE FROM clients;
    INSERT INTO properties VALUES ('property', 'Casa', 'Rua', NULL, 1000, 'DISPONIVEL', 1, 1);
    INSERT INTO clients VALUES ('tenant', 'Cliente', '123', '9999', NULL, 1, 1);
    INSERT INTO clients VALUES ('subtenant', 'Cliente 2', '456', '9999', NULL, 1, 1);`);
});
after(() => {
  sqlite.close();
  if (previousModule) require.cache[databaseModule] = previousModule;
  else delete require.cache[databaseModule];
});

describe("Rental SQLite persistence", () => {
  it("bootstraps fresh and existing databases idempotently", async () => {
    const bootstrap = createClient({ url: "file::memory:" });
    try {
      await initializeDatabase(bootstrap);
      await initializeDatabase(bootstrap);
      assert.equal((await bootstrap.execute("PRAGMA table_info(rentals)")).rows.length, 14);
      assert.equal((await bootstrap.execute("PRAGMA foreign_keys")).rows[0].foreign_keys, 1);
      assert.equal((await bootstrap.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.length, 10);
    } finally { bootstrap.close(); }
  });
  it("saves the association and ALUGADO status together", async () => {
    await repo.create(rental());
    assert.equal((await sqlite.execute("SELECT status FROM properties")).rows[0].status, "ALUGADO");
    const saved = await repo.findById("rental");
    assert.ok(saved);
    assert.equal(saved.monthlyRent, 1000);
    assert.equal((await repo.findAll()).length, 1);
  });
  it("rolls the status change back when insertion fails", async () => {
    await assert.rejects(repo.create({ ...rental(), tenantId: "missing" }), (error: Error & { cause?: Error }) =>
      /FOREIGN KEY/.test(error.cause?.message ?? error.message));
    assert.equal((await sqlite.execute("SELECT status FROM properties")).rows[0].status, "DISPONIVEL");
    assert.equal((await repo.findAll()).length, 0);
  });
  it("rejects concurrent primary associations", async () => {
    const results = await Promise.allSettled([repo.create(rental()), repo.create({ ...rental("second"), tenantId: "subtenant" })]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await repo.findAll()).length, 1);
  });
  it("enforces consent and accepts a valid subletting", async () => {
    await repo.create(rental());
    const child = { ...rental("child"), tenantId: "subtenant", parentRentalId: "rental" };
    await assert.rejects(repo.create(child), /RN02/);
    await repo.create({ ...child, formalConsent: "document.pdf" });
    assert.equal((await repo.findAll()).length, 2);
  });
  it("enforces RN01 and persists key release idempotently", async () => {
    await repo.create(rental());
    await assert.rejects(repo.releaseKeys("rental", 10), /RN01/);
    await repo.updatePrerequisites("rental", { contractSigned: true, signaturesNotarized: true, initialPaymentsPaid: true });
    assert.equal((await repo.releaseKeys("rental", 10)).keysReleasedAt, 10);
    assert.equal((await repo.releaseKeys("rental", 20)).keysReleasedAt, 10);
    await assert.rejects(repo.updatePrerequisites("rental", { contractSigned: false, signaturesNotarized: true, initialPaymentsPaid: true }), /already released/);
  });
  it("prevents property edits from changing ALUGADO while allowing other edits", async () => {
    await repo.create(rental());
    const propertyRepo = new DrizzlePropertyRepository();
    const property = await propertyRepo.findById("property");
    assert.ok(property);
    await assert.rejects(propertyRepo.update({ ...property, status: PropertyStatus.DISPONIVEL }), /must keep ALUGADO/);
    await propertyRepo.update({ ...property, title: "Casa atualizada" });
    const updated = await propertyRepo.findById("property");
    assert.equal(updated?.status, PropertyStatus.ALUGADO);
    assert.equal(updated?.title, "Casa atualizada");
  });
  it("preserves rentals when deleting referenced properties or clients", async () => {
    await repo.create(rental());
    await assert.rejects(sqlite.execute("DELETE FROM properties"), /FOREIGN KEY/);
    await assert.rejects(sqlite.execute("DELETE FROM clients WHERE id = 'tenant'"), /FOREIGN KEY/);
  });
});
