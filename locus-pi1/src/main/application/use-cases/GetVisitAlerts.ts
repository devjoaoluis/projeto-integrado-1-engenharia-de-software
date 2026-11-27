import { VisitAlert, VisitAlertUrgency, VisitReminderStage } from "../../domain/entities/VisitReminder";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";
import { IVisitReminderRepository } from "../../domain/repositories/IVisitReminderRepository";

export interface GetVisitAlertsOptions {
  now?: number;
  includeDismissed?: boolean;
  limit?: number;
}

export class GetVisitAlerts {
  constructor(
    private visitRepository: IVisitRepository,
    private reminderRepository?: IVisitReminderRepository
  ) {}

  async execute(options: GetVisitAlertsOptions = {}): Promise<VisitAlert[]> {
    const now = options.now ?? Date.now();
    const includeDismissed = options.includeDismissed ?? false;
    const limit = options.limit ?? 50;

    // Buscar visitas agendadas
    const visits = await this.visitRepository.findAll({ status: "AGENDADA" });
    const alerts: VisitAlert[] = [];

    // Carregar lembretes para checagem de descarte
    const existingReminders = this.reminderRepository
      ? await this.reminderRepository.findAll()
      : [];

    const reminderMap = new Map<string, { dismissedAt: number | null }>();
    for (const r of existingReminders) {
      reminderMap.set(`${r.visitId}:${r.stage}`, { dismissedAt: r.dismissedAt });
    }

    for (const visit of visits) {
      const reminderLeadMinutes = visit.reminderLeadMinutes;
      if (
        visit.notificationSent ||
        reminderLeadMinutes === null ||
        visit.scheduledAt <= now ||
        now < visit.scheduledAt - reminderLeadMinutes * 60_000
      ) {
        continue;
      }

      const diffMs = visit.scheduledAt - now;
      const diffMinutes = Math.ceil(diffMs / 60000);
      const scheduledDate = new Date(visit.scheduledAt);
      const timeStr = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = scheduledDate.toLocaleDateString("pt-BR");
      const stage: VisitReminderStage = "SCHEDULED_REMINDER";
      const reminderKey = `${visit.id}:${stage}`;
      const record = reminderMap.get(reminderKey);
      const isDismissed = Boolean(record && record.dismissedAt !== null);

      if (includeDismissed || !isDismissed) {
        alerts.push({
          id: reminderKey,
          visitId: visit.id,
          stage,
          urgency: diffMinutes <= 30 ? "HIGH" : "LOW",
          scheduledAt: visit.scheduledAt,
          reminderLeadMinutes,
          diffMinutes,
          title: `Lembrete de visita: ${visit.propertyTitle}`,
          message: `Visita com ${visit.clientName} para "${visit.propertyTitle}" em ${dateStr} às ${timeStr}.`,
          property: {
            id: visit.propertyId,
            title: visit.propertyTitle,
            address: visit.propertyAddress,
          },
          client: {
            id: visit.clientId,
            name: visit.clientName,
            phone: visit.clientPhone,
            email: visit.clientEmail,
          },
          notes: visit.notes,
          isDismissed,
          dismissedAt: record?.dismissedAt ?? null,
        });
      }
    }

    // Ordenação por urgência e depois cronologia
    const urgencyWeight: Record<VisitAlertUrgency, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    alerts.sort((a, b) => {
      const weightDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (weightDiff !== 0) return weightDiff;
      return a.scheduledAt - b.scheduledAt;
    });

    return alerts.slice(0, limit);
  }
}
