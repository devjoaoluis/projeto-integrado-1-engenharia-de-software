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

    const nowDate = new Date(now);

    for (const visit of visits) {
      const diffMs = visit.scheduledAt - now;
      const diffMinutes = Math.round(diffMs / 60000);

      const scheduledDate = new Date(visit.scheduledAt);
      const isSameDay =
        scheduledDate.getFullYear() === nowDate.getFullYear() &&
        scheduledDate.getMonth() === nowDate.getMonth() &&
        scheduledDate.getDate() === nowDate.getDate();

      const timeStr = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = scheduledDate.toLocaleDateString("pt-BR");

      let stage: VisitReminderStage | null = null;
      let urgency: VisitAlertUrgency = "LOW";
      let title = "";
      let message = "";

      if (diffMinutes >= -15 && diffMinutes <= 15) {
        stage = "NOW";
        urgency = "CRITICAL";
        title = `⏰ Visita agora: ${visit.propertyTitle}`;
        message = `A visita com ${visit.clientName} no imóvel "${visit.propertyTitle}" está acontecendo no horário agendado (${timeStr}).`;
      } else if (diffMinutes > 15 && diffMinutes <= 60) {
        stage = "IMMINENT_1H";
        urgency = "HIGH";
        title = `🔔 Visita em breve: ${visit.propertyTitle}`;
        message = `Faltam ${diffMinutes} minutos para a visita com ${visit.clientName} no imóvel "${visit.propertyTitle}" (${visit.propertyAddress}) às ${timeStr}.`;
      } else if (diffMinutes > 60 && isSameDay) {
        stage = "TODAY";
        urgency = "MEDIUM";
        title = `📅 Visita hoje: ${visit.propertyTitle}`;
        message = `Você tem uma visita agendada hoje às ${timeStr} com ${visit.clientName} no imóvel "${visit.propertyTitle}".`;
      } else if (diffMinutes > 60 && diffMinutes <= 1440 && !isSameDay) {
        stage = "UPCOMING_24H";
        urgency = "LOW";
        title = `🗓️ Visita amanhã: ${visit.propertyTitle}`;
        message = `Lembrete: Visita agendada para ${dateStr} às ${timeStr} com ${visit.clientName} no imóvel "${visit.propertyTitle}".`;
      } else if (diffMinutes < -15 && isSameDay) {
        stage = "OVERDUE";
        urgency = "MEDIUM";
        title = `⚠️ Visita pendente: ${visit.propertyTitle}`;
        message = `A visita com ${visit.clientName} no imóvel "${visit.propertyTitle}" estava agendada para hoje às ${timeStr} e ainda não foi concluída.`;
      }

      if (stage) {
        const reminderKey = `${visit.id}:${stage}`;
        const record = reminderMap.get(reminderKey);
        const isDismissed = Boolean(record && record.dismissedAt !== null);

        if (includeDismissed || !isDismissed) {
          alerts.push({
            id: reminderKey,
            visitId: visit.id,
            stage,
            urgency,
            scheduledAt: visit.scheduledAt,
            diffMinutes,
            title,
            message,
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
