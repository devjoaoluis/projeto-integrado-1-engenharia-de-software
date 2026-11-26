import crypto from "node:crypto";
import { VisitAlert, VisitReminderStage } from "../../domain/entities/VisitReminder";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";
import { IVisitReminderRepository } from "../../domain/repositories/IVisitReminderRepository";
import { GetVisitAlerts, GetVisitAlertsOptions } from "../use-cases/GetVisitAlerts";
import { DismissVisitReminder } from "../use-cases/DismissVisitReminder";

export interface IVisitNotifier {
  notify(alert: VisitAlert): Promise<void> | void;
}

export class ElectronVisitNotifier implements IVisitNotifier {
  notify(alert: VisitAlert): void {
    try {
      // 1. Notificação visual nativa do SO
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require("electron");
      if (
        electron.Notification &&
        typeof electron.Notification.isSupported === "function" &&
        electron.Notification.isSupported()
      ) {
        const notification = new electron.Notification({
          title: alert.title,
          body: alert.message,
          urgency: alert.urgency === "CRITICAL" ? "critical" : "normal",
        });
        notification.show();
      }
    } catch {
      // Falha silenciosa em ambiente sem display / headless
    }

    try {
      // 2. Notificação visual in-app via IPC para as janelas abertas
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require("electron");
      if (
        electron.BrowserWindow &&
        typeof electron.BrowserWindow.getAllWindows === "function"
      ) {
        const windows = electron.BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send("visits:reminder-notification", alert);
          }
        }
      }
    } catch {
      // Falha silenciosa se não houver janelas ou em testes
    }
  }
}

export class VisitReminderService {
  private timer: NodeJS.Timeout | null = null;
  private getAlertsUseCase: GetVisitAlerts;
  private dismissUseCase: DismissVisitReminder;

  constructor(
    private visitRepository: IVisitRepository,
    private reminderRepository: IVisitReminderRepository,
    private notifier: IVisitNotifier = new ElectronVisitNotifier()
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
      const alreadyTriggered = await this.reminderRepository.isTriggered(
        alert.visitId,
        alert.stage
      );

      if (!alreadyTriggered) {
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
      void err;
    });
    this.timer = setInterval(() => {
      this.checkAndDispatch().catch((err) => {
        void err;
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
