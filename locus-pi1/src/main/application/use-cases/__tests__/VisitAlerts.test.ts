import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { GetVisitAlerts } from "../GetVisitAlerts";
import { DismissVisitReminder } from "../DismissVisitReminder";
import { VisitReminderService, IVisitNotifier } from "../../services/VisitReminderService";
import { Visit, VisitWithDetails } from "../../../domain/entities/Visit";
import { VisitReminder, VisitReminderStage, VisitAlert } from "../../../domain/entities/VisitReminder";
import { IVisitRepository, VisitFilter } from "../../../domain/repositories/IVisitRepository";
import { IVisitReminderRepository } from "../../../domain/repositories/IVisitReminderRepository";

class MockVisitRepository implements IVisitRepository {
  visits: VisitWithDetails[] = [];

  async create(_visit: Visit): Promise<Visit> {
    throw new Error("Not implemented in this test");
  }

  async findById(id: string): Promise<Visit | null> {
    return this.visits.find((v) => v.id === id) ?? null;
  }

  async findWithDetailsById(id: string): Promise<VisitWithDetails | null> {
    return this.visits.find((v) => v.id === id) ?? null;
  }

  async findAll(filter?: VisitFilter): Promise<VisitWithDetails[]> {
    let result = [...this.visits];
    if (filter?.status) {
      result = result.filter((v) => v.status === filter.status);
    }
    return result;
  }

  async findByPropertyId(propertyId: string): Promise<VisitWithDetails[]> {
    return this.visits.filter((v) => v.propertyId === propertyId);
  }

  async findByClientId(clientId: string): Promise<VisitWithDetails[]> {
    return this.visits.filter((v) => v.clientId === clientId);
  }

  async findUpcoming(limit = 10, nowTimestamp = Date.now()): Promise<VisitWithDetails[]> {
    return this.visits
      .filter((v) => v.status === "AGENDADA" && v.scheduledAt >= nowTimestamp)
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
      .slice(0, limit);
  }

  async markNotificationSent(
    id: string,
    scheduledAt: number,
    reminderLeadMinutes: 30 | 1440 | 2880 | 10080,
    now: number
  ): Promise<boolean> {
    const visit = this.visits.find((item) => item.id === id);
    if (
      !visit ||
      visit.notificationSent ||
      visit.status !== "AGENDADA" ||
      visit.scheduledAt !== scheduledAt ||
      visit.reminderLeadMinutes !== reminderLeadMinutes ||
      visit.scheduledAt <= now
    ) return false;
    visit.notificationSent = true;
    return true;
  }

  async update(visit: Visit): Promise<Visit> {
    const idx = this.visits.findIndex((v) => v.id === visit.id);
    if (idx !== -1) {
      this.visits[idx] = { ...this.visits[idx], ...visit };
    }
    return visit;
  }

  async delete(id: string): Promise<void> {
    this.visits = this.visits.filter((v) => v.id !== id);
  }
}

class MockVisitReminderRepository implements IVisitReminderRepository {
  reminders: VisitReminder[] = [];

  async recordTriggered(reminder: VisitReminder): Promise<VisitReminder> {
    const existingIdx = this.reminders.findIndex(
      (r) => r.visitId === reminder.visitId && r.stage === reminder.stage
    );
    if (existingIdx !== -1) {
      this.reminders[existingIdx] = reminder;
    } else {
      this.reminders.push(reminder);
    }
    return reminder;
  }

  async isTriggered(visitId: string, stage: VisitReminderStage): Promise<boolean> {
    return this.reminders.some((r) => r.visitId === visitId && r.stage === stage);
  }

  async dismiss(visitId: string, stage: VisitReminderStage, dismissedAt = Date.now()): Promise<void> {
    const existing = this.reminders.find((r) => r.visitId === visitId && r.stage === stage);
    if (existing) {
      existing.dismissedAt = dismissedAt;
    } else {
      this.reminders.push({
        id: `reminder-${Date.now()}`,
        visitId,
        stage,
        triggeredAt: dismissedAt,
        dismissedAt,
        createdAt: dismissedAt,
      });
    }
  }

  async findByVisitId(visitId: string): Promise<VisitReminder[]> {
    return this.reminders.filter((r) => r.visitId === visitId);
  }

  async findAll(): Promise<VisitReminder[]> {
    return [...this.reminders];
  }
}

class MockNotifier implements IVisitNotifier {
  notifiedAlerts: VisitAlert[] = [];

  notify(alert: VisitAlert): void {
    this.notifiedAlerts.push(alert);
  }
}

describe("HU-09: Lembretes de Visitas (RF09) - Backend", () => {
  let visitRepo: MockVisitRepository;
  let reminderRepo: MockVisitReminderRepository;
  let notifier: MockNotifier;

  const baseDate = new Date("2026-11-20T10:00:00.000Z");
  const now = baseDate.getTime();

  beforeEach(() => {
    visitRepo = new MockVisitRepository();
    reminderRepo = new MockVisitReminderRepository();
    notifier = new MockNotifier();
  });

  const createSampleVisit = (
    id: string,
    scheduledAt: number,
    status: "AGENDADA" | "REALIZADA" | "CANCELADA" = "AGENDADA"
  ): VisitWithDetails => ({
    id,
    propertyId: "prop-101",
    propertyTitle: "Cobertura Jardins",
    propertyAddress: "Alameda Santos, 1000",
    clientId: "client-202",
    clientName: "Carlos Eduardo",
    clientPhone: "(11) 99999-8888",
    clientEmail: "carlos@email.com",
    scheduledAt,
    reminderLeadMinutes: 30,
    notificationSent: false,
    status,
    notes: "Interesse em locação comercial",
    createdAt: now - 86400000,
    updatedAt: now - 86400000,
  });

  it("deve gerar um alerta quando atingir a antecedência configurada", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // O envio acontece no limite inclusivo de 30 minutos.
    const scheduledAt = now + 30 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-now", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "SCHEDULED_REMINDER");
    assert.equal(alerts[0].urgency, "HIGH");
    assert.ok(alerts[0].title.includes("Lembrete de visita"));
    assert.ok(alerts[0].message.includes("Carlos Eduardo"));
    assert.ok(alerts[0].message.includes("Cobertura Jardins"));
    assert.equal(alerts[0].property.title, "Cobertura Jardins");
    assert.equal(alerts[0].client.phone, "(11) 99999-8888");
  });

  it("não deve alertar antes da antecedência configurada nem depois do horário da visita", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita marcada para daqui a 35 minutos
    const scheduledAt = now + 35 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-imminent", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 0);

    const expiredAlerts = await getAlerts.execute({ now: scheduledAt });
    assert.equal(expiredAlerts.length, 0);
  });

  it("deve respeitar a antecedência de um dia escolhida na visita", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita hoje daqui a 3 horas
    const scheduledAt = now + 3 * 60 * 60 * 1000;
    visitRepo.visits.push({ ...createSampleVisit("v-today", scheduledAt), reminderLeadMinutes: 1440 });

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "SCHEDULED_REMINDER");
    assert.equal(alerts[0].urgency, "LOW");
  });

  it("deve reconhecer a antecedência de dois dias e de uma semana", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita amanhã às 10:00 (daqui a 20 horas)
    const scheduledAt = now + 20 * 60 * 60 * 1000;
    visitRepo.visits.push({ ...createSampleVisit("v-24h", scheduledAt), reminderLeadMinutes: 2880 });
    visitRepo.visits.push({
      ...createSampleVisit("v-week", now + 6 * 86400000),
      reminderLeadMinutes: 10080,
    });

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 2);
    assert.ok(alerts.every((alert) => alert.stage === "SCHEDULED_REMINDER"));
  });

  it("não deve gerar lembrete depois do horário da visita", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita hoje há 40 minutos atrás que não foi marcada como realizada
    const scheduledAt = now - 40 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-overdue", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 0);
  });

  it("não deve gerar alertas para visitas com status REALIZADA ou CANCELADA", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    visitRepo.visits.push(createSampleVisit("v-realizada", now + 10 * 60 * 1000, "REALIZADA"));
    visitRepo.visits.push(createSampleVisit("v-cancelada", now + 10 * 60 * 1000, "CANCELADA"));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 0);
  });

  it("não deve alertar visitas sem lembrete ou já notificadas", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);
    visitRepo.visits.push(
      { ...createSampleVisit("v-disabled", now + 10 * 60 * 1000), reminderLeadMinutes: null },
      { ...createSampleVisit("v-sent", now + 10 * 60 * 1000), notificationSent: true }
    );

    assert.equal((await getAlerts.execute({ now })).length, 0);
  });

  it("deve priorizar ordenação por urgência (CRITICAL > HIGH > MEDIUM > LOW)", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Adiciona em ordem não ordenada
    visitRepo.visits.push({ ...createSampleVisit("v-24h", now + 20 * 60 * 60 * 1000), reminderLeadMinutes: 10080 });
    visitRepo.visits.push(createSampleVisit("v-now", now + 2 * 60 * 1000));
    visitRepo.visits.push(createSampleVisit("v-imm", now + 30 * 60 * 1000));
    visitRepo.visits.push({ ...createSampleVisit("v-today", now + 4 * 60 * 60 * 1000), reminderLeadMinutes: 10080 });

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 4);
    assert.equal(alerts[0].urgency, "HIGH");
    assert.equal(alerts[1].urgency, "HIGH");
    assert.equal(alerts[2].urgency, "LOW");
    assert.equal(alerts[3].urgency, "LOW");
  });

  it("deve filtrar alertas descartados a menos que includeDismissed seja true", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);
    const dismiss = new DismissVisitReminder(reminderRepo);

    const scheduledAt = now + 30 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-dismiss", scheduledAt));

    // Antes de descartar
    let alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].isDismissed, false);

    // Descarta o alerta
    await dismiss.execute({ visitId: "v-dismiss", stage: "SCHEDULED_REMINDER" });

    // Consulta padrão (não inclui descartados)
    alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 0);

    // Consulta incluindo descartados
    alerts = await getAlerts.execute({ now, includeDismissed: true });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].isDismissed, true);
    assert.ok(alerts[0].dismissedAt);
  });

  it("VisitReminderService: deve disparar notificação visual e deduplicar envios futuros", async () => {
    const service = new VisitReminderService(visitRepo, reminderRepo, notifier);

    const scheduledAt = now + 25 * 60 * 1000; // IMMINENT_1H
    visitRepo.visits.push(createSampleVisit("v-service-1", scheduledAt));

    // Primeiro disparo automático
    const dispatched = await service.checkAndDispatch(now);
    assert.equal(dispatched.length, 1);
    assert.equal(notifier.notifiedAlerts.length, 1);
    assert.equal(notifier.notifiedAlerts[0].visitId, "v-service-1");
    assert.equal(notifier.notifiedAlerts[0].stage, "SCHEDULED_REMINDER");

    // Registro deve estar gravado no repositório de lembretes
    const isTriggered = await reminderRepo.isTriggered("v-service-1", "SCHEDULED_REMINDER");
    assert.equal(isTriggered, true);
    assert.equal(visitRepo.visits[0].notificationSent, true);

    // Segunda checagem imediata não deve re-disparar a mesma notificação (evita spam)
    const secondDispatched = await service.checkAndDispatch(now);
    assert.equal(secondDispatched.length, 0);
    assert.equal(notifier.notifiedAlerts.length, 1);
  });

  it("VisitReminderService: deve enviar uma única notificação conforme antecedência escolhida", async () => {
    const service = new VisitReminderService(visitRepo, reminderRepo, notifier);

    // Visita agendada para as 12:00
    const scheduledAt = baseDate.getTime() + 2 * 60 * 60 * 1000;
    visitRepo.visits.push({
      ...createSampleVisit("v-service-2", scheduledAt),
      reminderLeadMinutes: 1440,
    });

    // O lembrete configurado para um dia antes já está vencido.
    const dispatchedAt10 = await service.checkAndDispatch(now);
    assert.equal(dispatchedAt10.length, 1);
    assert.equal(dispatchedAt10[0].stage, "SCHEDULED_REMINDER");
    assert.equal(notifier.notifiedAlerts.length, 1);

    const timeAt1130 = now + 90 * 60 * 1000;
    const dispatchedAt1130 = await service.checkAndDispatch(timeAt1130);
    assert.equal(dispatchedAt1130.length, 0);
    assert.equal(notifier.notifiedAlerts.length, 1);

    const timeAt1200 = scheduledAt;
    const dispatchedAt1200 = await service.checkAndDispatch(timeAt1200);
    assert.equal(dispatchedAt1200.length, 0);
    assert.equal(notifier.notifiedAlerts.length, 1);
  });

  it("VisitReminderService: deve iniciar e parar o monitoramento em background", () => {
    const service = new VisitReminderService(visitRepo, reminderRepo, notifier);

    service.start(5000);
    // Iniciar novamente não deve quebrar nem duplicar timers
    service.start(5000);

    service.stop();
  });
});
