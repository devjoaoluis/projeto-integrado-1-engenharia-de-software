import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { OverdueNotification } from "../../../domain/entities/OverdueRent";

const sqlite = createClient({ url: "file::memory:" });
const dbModule = require.resolve("../../database/db");
const previousDb = require.cache[dbModule];
require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DrizzleOverdueNotificationRepository } = require("../DrizzleOverdueNotificationRepository") as typeof import("../DrizzleOverdueNotificationRepository");

let notificationRepo: InstanceType<typeof DrizzleOverdueNotificationRepository>;

before(async () => {
  await initializeDatabase(sqlite);
  notificationRepo = new DrizzleOverdueNotificationRepository();
});

beforeEach(async () => {
  await sqlite.executeMultiple(`
    DELETE FROM overdue_notifications;
    DELETE FROM rentals;
    DELETE FROM properties;
    DELETE FROM clients;
  `);

  await sqlite.executeMultiple(`
    INSERT INTO properties (id, title, address, price, status, created_at, updated_at)
    VALUES ('prop-test-1', 'Casa Teste', 'Rua B, 200', 3000, 'ALUGADO', 1000, 1000);

    INSERT INTO clients (id, name, phone, email, created_at, updated_at)
    VALUES ('client-test-1', 'Locatário Teste', '(11) 97777-1111', 'locatario@teste.com', 1000, 1000);

    INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, due_day, contract_signed, signatures_notarized, initial_payments_paid, created_at, updated_at)
    VALUES ('rental-test-1', 'prop-test-1', 'client-test-1', 3000, 1000, 10, 1, 1, 1, 1000, 1000);
  `);
});

after(() => {
  sqlite.close();
  if (previousDb) require.cache[dbModule] = previousDb;
  else delete require.cache[dbModule];
});

describe("HU-10: DrizzleOverdueNotificationRepository - SQLite Persistence", () => {
  it("persiste notificação de atraso e lista por mês e locação", async () => {
    const notification: OverdueNotification = {
      id: "notif-test-1",
      rentalId: "rental-test-1",
      contractId: null,
      tenantId: "client-test-1",
      referenceMonth: "08/2026",
      dueDate: 1723248000000,
      daysOverdue: 15,
      originalAmount: 3000,
      interestAmount: 15,
      fineAmount: 900,
      totalAmount: 3915,
      message: "Prezado locatário, aluguel em atraso...",
      channel: "SYSTEM",
      createdAt: 1724544000000,
    };

    const saved = await notificationRepo.create(notification);
    assert.equal(saved.id, "notif-test-1");

    const byRentalMonth = await notificationRepo.findByRentalAndMonth("rental-test-1", "08/2026");
    assert.equal(byRentalMonth.length, 1);
    assert.equal(byRentalMonth[0].totalAmount, 3915);

    const latest = await notificationRepo.findLatestForRentalMonth("rental-test-1", "08/2026");
    assert.ok(latest);
    assert.equal(latest.id, "notif-test-1");
  });

  it("RNF01: garante exclusão em cascata ao remover a locação ou o cliente", async () => {
    const notification: OverdueNotification = {
      id: "notif-test-cascade",
      rentalId: "rental-test-1",
      contractId: null,
      tenantId: "client-test-1",
      referenceMonth: "08/2026",
      dueDate: 1723248000000,
      daysOverdue: 10,
      originalAmount: 3000,
      interestAmount: 10,
      fineAmount: 600,
      totalAmount: 3610,
      message: "Notificação cascata",
      channel: "SYSTEM",
      createdAt: 1000,
    };

    await notificationRepo.create(notification);
    let list = await notificationRepo.list();
    assert.equal(list.length, 1);

    // Deleta o aluguel
    await sqlite.execute("DELETE FROM rentals WHERE id = 'rental-test-1'");

    list = await notificationRepo.list();
    assert.equal(list.length, 0);
  });
});

describe("HU-10: IPC Registration and Handlers", () => {
  it("registra todos os handlers de overdue:* adequadamente", () => {
    type IpcHandler = (...args: unknown[]) => unknown;
    const handlers = new Map<string, IpcHandler>();
    const electronModule = require.resolve("electron");
    const previous = require.cache[electronModule];

    require.cache[electronModule] = {
      exports: {
        ipcMain: {
          handle: (channel: string, handler: IpcHandler) => handlers.set(channel, handler),
        },
      },
    } as NodeModule;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { registerOverdueIpc } = require("../../../ipc/overdue.ipc");
      registerOverdueIpc();

      const expectedHandlers = [
        "overdue:check",
        "overdue:trigger-alerts",
        "overdue:settle-debt",
        "overdue:list-notifications",
      ];

      for (const channel of expectedHandlers) {
        assert.ok(handlers.has(channel), `Canal IPC ${channel} deve ser registrado`);
      }
    } finally {
      if (previous) require.cache[electronModule] = previous;
      else delete require.cache[electronModule];
    }
  });
});
