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
    status,
    notes: "Interesse em locação comercial",
    createdAt: now - 86400000,
    updatedAt: now - 86400000,
  });

  it("deve gerar alerta de urgência CRITICAL (estágio NOW) para visita no horário exato", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita marcada para daqui a 5 minutos (janela -15 a +15 min)
    const scheduledAt = now + 5 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-now", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "NOW");
    assert.equal(alerts[0].urgency, "CRITICAL");
    assert.ok(alerts[0].title.includes("Visita agora"));
    assert.ok(alerts[0].message.includes("Carlos Eduardo"));
    assert.ok(alerts[0].message.includes("Cobertura Jardins"));
    assert.equal(alerts[0].property.title, "Cobertura Jardins");
    assert.equal(alerts[0].client.phone, "(11) 99999-8888");
  });

  it("deve gerar alerta de urgência HIGH (estágio IMMINENT_1H) para visita dentro da próxima hora", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita marcada para daqui a 35 minutos
    const scheduledAt = now + 35 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-imminent", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "IMMINENT_1H");
    assert.equal(alerts[0].urgency, "HIGH");
    assert.ok(alerts[0].title.includes("Visita em breve"));
    assert.ok(alerts[0].message.includes("Faltam 35 minutos"));
  });

  it("deve gerar alerta de urgência MEDIUM (estágio TODAY) para visita no mesmo dia com mais de 1h de antecedência", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita hoje daqui a 3 horas
    const scheduledAt = now + 3 * 60 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-today", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "TODAY");
    assert.equal(alerts[0].urgency, "MEDIUM");
    assert.ok(alerts[0].title.includes("Visita hoje"));
  });

  it("deve gerar alerta de urgência LOW (estágio UPCOMING_24H) para visita no dia seguinte dentro de 24h", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita amanhã às 10:00 (daqui a 20 horas)
    const scheduledAt = now + 20 * 60 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-24h", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "UPCOMING_24H");
    assert.equal(alerts[0].urgency, "LOW");
    assert.ok(alerts[0].title.includes("Visita amanhã"));
  });

  it("deve gerar alerta OVERDUE para visita de hoje cujo horário expirou e segue pendente", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Visita hoje há 40 minutos atrás que não foi marcada como realizada
    const scheduledAt = now - 40 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-overdue", scheduledAt));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].stage, "OVERDUE");
    assert.equal(alerts[0].urgency, "MEDIUM");
    assert.ok(alerts[0].title.includes("Visita pendente"));
  });

  it("não deve gerar alertas para visitas com status REALIZADA ou CANCELADA", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    visitRepo.visits.push(createSampleVisit("v-realizada", now + 10 * 60 * 1000, "REALIZADA"));
    visitRepo.visits.push(createSampleVisit("v-cancelada", now + 10 * 60 * 1000, "CANCELADA"));

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 0);
  });

  it("deve priorizar ordenação por urgência (CRITICAL > HIGH > MEDIUM > LOW)", async () => {
    const getAlerts = new GetVisitAlerts(visitRepo, reminderRepo);

    // Adiciona em ordem não ordenada
    visitRepo.visits.push(createSampleVisit("v-24h", now + 20 * 60 * 60 * 1000)); // LOW
    visitRepo.visits.push(createSampleVisit("v-now", now + 2 * 60 * 1000));        // CRITICAL
    visitRepo.visits.push(createSampleVisit("v-imm", now + 30 * 60 * 1000));       // HIGH
    visitRepo.visits.push(createSampleVisit("v-today", now + 4 * 60 * 60 * 1000));  // MEDIUM

    const alerts = await getAlerts.execute({ now });
    assert.equal(alerts.length, 4);
    assert.equal(alerts[0].urgency, "CRITICAL");
    assert.equal(alerts[1].urgency, "HIGH");
    assert.equal(alerts[2].urgency, "MEDIUM");
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
    await dismiss.execute({ visitId: "v-dismiss", stage: "IMMINENT_1H" });

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
    assert.equal(notifier.notifiedAlerts[0].stage, "IMMINENT_1H");

    // Registro deve estar gravado no repositório de lembretes
    const isTriggered = await reminderRepo.isTriggered("v-service-1", "IMMINENT_1H");
    assert.equal(isTriggered, true);

    // Segunda checagem imediata não deve re-disparar a mesma notificação (evita spam)
    const secondDispatched = await service.checkAndDispatch(now);
    assert.equal(secondDispatched.length, 0);
    assert.equal(notifier.notifiedAlerts.length, 1);
  });

  it("VisitReminderService: deve disparar nova notificação quando a visita progredir para novo estágio", async () => {
    const service = new VisitReminderService(visitRepo, reminderRepo, notifier);

    // Visita agendada para as 12:00
    const scheduledAt = baseDate.getTime() + 2 * 60 * 60 * 1000;
    visitRepo.visits.push(createSampleVisit("v-service-2", scheduledAt));

    // Às 10:00 (now): estágio TODAY (> 60min)
    const dispatchedAt10 = await service.checkAndDispatch(now);
    assert.equal(dispatchedAt10.length, 1);
    assert.equal(dispatchedAt10[0].stage, "TODAY");
    assert.equal(notifier.notifiedAlerts.length, 1);

    // Às 11:30 (daqui a 1h30min): faltam 30 minutos -> estágio IMMINENT_1H
    const timeAt1130 = now + 90 * 60 * 1000;
    const dispatchedAt1130 = await service.checkAndDispatch(timeAt1130);
    assert.equal(dispatchedAt1130.length, 1);
    assert.equal(dispatchedAt1130[0].stage, "IMMINENT_1H");
    assert.equal(notifier.notifiedAlerts.length, 2);

    // Às 12:00 (horário exato): estágio NOW
    const timeAt1200 = scheduledAt;
    const dispatchedAt1200 = await service.checkAndDispatch(timeAt1200);
    assert.equal(dispatchedAt1200.length, 1);
    assert.equal(dispatchedAt1200[0].stage, "NOW");
    assert.equal(notifier.notifiedAlerts.length, 3);
  });

  it("VisitReminderService: deve iniciar e parar o monitoramento em background", () => {
    const service = new VisitReminderService(visitRepo, reminderRepo, notifier);

    service.start(5000);
    // Iniciar novamente não deve quebrar nem duplicar timers
    service.start(5000);

    service.stop();
  });
});
