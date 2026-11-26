import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { VisitReminder } from "../../../domain/entities/VisitReminder";

const sqlite = createClient({ url: "file::memory:" });
const dbModule = require.resolve("../../database/db");
const previousDb = require.cache[dbModule];
require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;

// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleVisitReminderRepository } = require("../DrizzleVisitReminderRepository") as typeof import("../DrizzleVisitReminderRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleVisitRepository } = require("../DrizzleVisitRepository") as typeof import("../DrizzleVisitRepository");

let reminderRepo: InstanceType<typeof DrizzleVisitReminderRepository>;
let visitRepo: InstanceType<typeof DrizzleVisitRepository>;

before(async () => {
  await initializeDatabase(sqlite);
  reminderRepo = new DrizzleVisitReminderRepository();
  visitRepo = new DrizzleVisitRepository();
});

beforeEach(async () => {
  await sqlite.executeMultiple(`
    DELETE FROM visit_reminders;
    DELETE FROM property_visits;
    DELETE FROM properties;
    DELETE FROM clients;
  `);

  // Insere fixtures base
  await sqlite.executeMultiple(`
    INSERT INTO properties (id, title, address, price, status, created_at, updated_at)
    VALUES ('prop-test-1', 'Apartamento Teste', 'Rua A, 100', 2500, 'DISPONIVEL', 1000, 1000);

    INSERT INTO clients (id, name, phone, email, created_at, updated_at)
    VALUES ('client-test-1', 'Cliente Teste', '(11) 98888-0000', 'cliente@teste.com', 1000, 1000);

    INSERT INTO property_visits (id, property_id, client_id, scheduled_at, status, created_at, updated_at)
    VALUES ('visit-test-1', 'prop-test-1', 'client-test-1', 1799000000000, 'AGENDADA', 1000, 1000);
  `);
});

after(() => {
  sqlite.close();
  if (previousDb) require.cache[dbModule] = previousDb;
  else delete require.cache[dbModule];
});

describe("HU-09: DrizzleVisitReminderRepository - SQLite Persistence", () => {
  it("persiste disparo de lembrete com sucesso e verifica isTriggered", async () => {
    const isAlreadyTriggered = await reminderRepo.isTriggered("visit-test-1", "IMMINENT_1H");
    assert.equal(isAlreadyTriggered, false);

    const reminder: VisitReminder = {
      id: "rem-1",
      visitId: "visit-test-1",
      stage: "IMMINENT_1H",
      triggeredAt: 1799000000000,
      dismissedAt: null,
      createdAt: 1799000000000,
    };

    await reminderRepo.recordTriggered(reminder);

    const isNowTriggered = await reminderRepo.isTriggered("visit-test-1", "IMMINENT_1H");
    assert.equal(isNowTriggered, true);

    const byVisit = await reminderRepo.findByVisitId("visit-test-1");
    assert.equal(byVisit.length, 1);
    assert.equal(byVisit[0].stage, "IMMINENT_1H");
    assert.equal(byVisit[0].dismissedAt, null);
  });

  it("atualiza disparo existente de forma idempotente sem duplicar chave (visitId, stage)", async () => {
    const reminder: VisitReminder = {
      id: "rem-dup",
      visitId: "visit-test-1",
      stage: "TODAY",
      triggeredAt: 1000,
      dismissedAt: null,
      createdAt: 1000,
    };

    await reminderRepo.recordTriggered(reminder);

    // Segundo disparo atualiza o timestamp
    await reminderRepo.recordTriggered({
      ...reminder,
      triggeredAt: 2000,
    });

    const all = await reminderRepo.findAll();
    assert.equal(all.filter((r) => r.visitId === "visit-test-1" && r.stage === "TODAY").length, 1);
    const updated = all.find((r) => r.visitId === "visit-test-1" && r.stage === "TODAY");
    assert.equal(updated?.triggeredAt, 2000);
  });

  it("marca lembrete como descartado (dismiss) preservando integridade", async () => {
    await reminderRepo.recordTriggered({
      id: "rem-dismiss",
      visitId: "visit-test-1",
      stage: "NOW",
      triggeredAt: 5000,
      dismissedAt: null,
      createdAt: 5000,
    });

    await reminderRepo.dismiss("visit-test-1", "NOW", 9999);

    const byVisit = await reminderRepo.findByVisitId("visit-test-1");
    const dismissed = byVisit.find((r) => r.stage === "NOW");
    assert.ok(dismissed);
    assert.equal(dismissed.dismissedAt, 9999);
  });

  it("permite descartar lembrete mesmo que ainda não tenha sido gravado antes", async () => {
    await reminderRepo.dismiss("visit-test-1", "UPCOMING_24H", 12345);

    const isTriggered = await reminderRepo.isTriggered("visit-test-1", "UPCOMING_24H");
    assert.equal(isTriggered, true);

    const byVisit = await reminderRepo.findByVisitId("visit-test-1");
    const record = byVisit.find((r) => r.stage === "UPCOMING_24H");
    assert.ok(record);
    assert.equal(record.dismissedAt, 12345);
  });

  it("RNF01: exclui lembretes em cascata quando a visita agendada for removida", async () => {
    await reminderRepo.recordTriggered({
      id: "rem-cascade",
      visitId: "visit-test-1",
      stage: "TODAY",
      triggeredAt: 5000,
      dismissedAt: null,
      createdAt: 5000,
    });

    assert.equal((await reminderRepo.findByVisitId("visit-test-1")).length, 1);

    // Deleta a visita vinculada
    await visitRepo.delete("visit-test-1");

    // Lembretes órfãos não devem existir
    assert.equal((await reminderRepo.findByVisitId("visit-test-1")).length, 0);
  });
});

describe("HU-09: IPC Registration and Handlers", () => {
  it("registra todos os handlers de lembretes e responde adequadamente", async () => {
    type IpcHandler = (...args: unknown[]) => unknown;
    const handlers = new Map<string, IpcHandler>();
    const electronModule = require.resolve("electron");
    const previous = require.cache[electronModule];

    require.cache[electronModule] = {
      exports: {
        ipcMain: {
          handle: (channel: string, handler: IpcHandler) => handlers.set(channel, handler),
        },
        Notification: class {
          static isSupported() { return false; }
          show(): void { return undefined; }
        },
        BrowserWindow: {
          getAllWindows: (): unknown[] => [],
        },
      },
    } as NodeModule;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { registerVisitsIpc } = require("../../../ipc/visits.ipc");
      const service = registerVisitsIpc();

      assert.ok(handlers.has("visits:get-alerts"));
      assert.ok(handlers.has("visits:check-reminders"));
      assert.ok(handlers.has("visits:dismiss-reminder"));

      // Chama visits:get-alerts
      const alerts = await handlers.get("visits:get-alerts")!({}, {});
      assert.ok(Array.isArray(alerts));

      // Chama visits:check-reminders
      const checked = await handlers.get("visits:check-reminders")!({});
      assert.ok(Array.isArray(checked));

      // Chama visits:dismiss-reminder
      const dismissed = (await handlers.get("visits:dismiss-reminder")!({}, {
        visitId: "visit-test-1",
        stage: "TODAY",
      })) as { success: boolean };
      assert.equal(dismissed.success, true);

      service.stop();
    } finally {
      if (previous) require.cache[electronModule] = previous;
      else delete require.cache[electronModule];
    }
  });
});
