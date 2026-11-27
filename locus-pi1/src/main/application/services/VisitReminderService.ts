import crypto from "node:crypto";
import { VisitAlert, VisitReminderStage } from "../../domain/entities/VisitReminder";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";
import { IVisitReminderRepository } from "../../domain/repositories/IVisitReminderRepository";
import { GetVisitAlerts, GetVisitAlertsOptions } from "../use-cases/GetVisitAlerts";
import { DismissVisitReminder } from "../use-cases/DismissVisitReminder";
import { NotificationService } from "./NotificationService";

export interface IVisitNotifier {
  notify(alert: VisitAlert): Promise<void> | void;
}

export class NotificationServiceVisitNotifier implements IVisitNotifier {
  constructor(private readonly notificationService: NotificationService) {}

  async notify(alert: VisitAlert): Promise<void> {
    await this.notificationService.publish({
      id: `visit:${alert.visitId}:${alert.stage}:${alert.scheduledAt}`,
      category: "VISIT",
      title: alert.title,
      message: alert.message,
      target: `/visitas?visitId=${encodeURIComponent(alert.visitId)}`,
      entityId: alert.visitId,
      data: {
        visitId: alert.visitId,
        stage: alert.stage,
        scheduledAt: alert.scheduledAt,
      },
    });
  }
}

export class VisitReminderService {
  private timer: NodeJS.Timeout | null = null;
  private getAlertsUseCase: GetVisitAlerts;
  private dismissUseCase: DismissVisitReminder;

  constructor(
    private visitRepository: IVisitRepository,
    private reminderRepository: IVisitReminderRepository,
    private notifier: IVisitNotifier
  ) {
    this.getAlertsUseCase = new GetVisitAlerts(this.visitRepository, this.reminderRepository);
    this.dismissUseCase = new DismissVisitReminder(this.reminderRepository);
  }

  /**
   * Obtém a lista de alertas ativos de visitas calculados para o momento.
   */
  async getAlerts(options?: GetVisitAlertsOptions): Promise<VisitAlert[]> {
    return this.getAlertsUseCase.execute(options);
  }

  /**
   * Avalia as visitas agendadas e dispara notificações para os novos lembretes não acionados.
   * Retorna os alertas que foram disparados nesta execução.
   */
  async checkAndDispatch(now: number = Date.now()): Promise<VisitAlert[]> {
    const activeAlerts = await this.getAlertsUseCase.execute({
      now,
      includeDismissed: false,
    });

    const dispatched: VisitAlert[] = [];

    for (const alert of activeAlerts) {
      const claimed = await this.visitRepository.markNotificationSent(
        alert.visitId,
        alert.scheduledAt,
        alert.reminderLeadMinutes,
        now
      );
      if (!claimed) {
        continue;
      }

      await this.notifier.notify(alert);
      await this.reminderRepository.recordTriggered({
        id: crypto.randomUUID(),
        visitId: alert.visitId,
        stage: alert.stage,
        triggeredAt: now,
        dismissedAt: null,
        createdAt: now,
      });
      dispatched.push(alert);
    }

    return dispatched;
  }

  /**
   * Descarta um lembrete específico de visita.
   */
  async dismissReminder(
    visitId: string,
    stage: VisitReminderStage,
    dismissedAt?: number
  ): Promise<{ success: boolean }> {
    return this.dismissUseCase.execute({ visitId, stage, dismissedAt });
  }

  /**
   * Inicia o monitoramento periódico em segundo plano.
   */
  start(intervalMs = 60000): void {
    this.stop();
    // Executa uma checagem imediata ao iniciar
    this.checkAndDispatch().catch((err) => {
      console.error("Erro ao verificar lembretes de visitas:", err);
    });
    this.timer = setInterval(() => {
      this.checkAndDispatch().catch((err) => {
        console.error("Erro ao verificar lembretes de visitas:", err);
      });
    }, intervalMs);
  }

  /**
   * Para o monitoramento periódico.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
