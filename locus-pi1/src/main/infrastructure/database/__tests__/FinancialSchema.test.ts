import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { initializeDatabase } from "../initializeDatabase";

const migrations = path.join(process.cwd(), "src/main/infrastructure/database/migrations");

describe("finance schema migration", () => {
  it("preserves receipts, backfills integer cents, and allows partial payments per month", async () => {
    const database = createClient({ url: "file::memory:" });
    try {
      const journal = JSON.parse(
        await fs.readFile(path.join(migrations, "meta/_journal.json"), "utf8"),
      ) as { entries: { idx: number; tag: string }[] };
      for (const entry of journal.entries.filter((item) => item.idx < 17)) {
        await database.executeMultiple(
          await fs.readFile(path.join(migrations, `${entry.tag}.sql`), "utf8"),
        );
      }

      await database.executeMultiple(`
        INSERT INTO properties (id, title, address, price, status, created_at, updated_at)
          VALUES ('property', 'Casa', 'Rua', 1000, 'ALUGADO', 1, 1);
        INSERT INTO clients (id, name, cpf_cnpj, phone, created_at, updated_at)
          VALUES ('tenant', 'João', '12345678901', '999', 1, 1);
        INSERT INTO property_contracts
          (id, property_id, tenant_id, reference, monthly_rent, start_date, status, created_at)
          VALUES ('contract', 'property', 'tenant', 'CTR-1', 123.45, 1, 'ACTIVE', 1);
        INSERT INTO property_payments
          (id, property_id, contract_id, amount, paid_at, description, created_at, reference_month, due_date)
          VALUES ('receipt-1', 'property', 'contract', 123.45, 2, 'Parcela', 2, '01/2026', 3);
      `);

      await initializeDatabase(database);
      await initializeDatabase(database);

      const payment = (await database.execute(
        "SELECT amount, amount_cents FROM property_payments WHERE id = 'receipt-1'",
      )).rows[0];
      assert.equal(payment.amount, 123.45);
      assert.equal(payment.amount_cents, 12345);
      await database.execute({
        sql: `INSERT INTO property_payments
          (id, property_id, contract_id, amount, amount_cents, paid_at, description, created_at, reference_month, due_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ["receipt-2", "property", "contract", 10, 1000, 4, "Pagamento parcial", 4, "01/2026", 3],
      });
      assert.equal(
        (await database.execute(
          "SELECT COUNT(*) AS count FROM property_payments WHERE contract_id = 'contract' AND reference_month = '01/2026'",
        )).rows[0].count,
        2,
      );
      const rules = (await database.execute(
        "SELECT grace_days, fine_rate_basis_points FROM financial_settings WHERE id = 1",
      )).rows[0];
      assert.equal(rules.grace_days, 3);
      assert.equal(rules.fine_rate_basis_points, 1000);
      assert.deepEqual((await database.execute("PRAGMA foreign_key_check")).rows, []);
    } finally {
      database.close();
    }
  });
});
