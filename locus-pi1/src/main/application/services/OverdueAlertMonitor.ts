import { TriggerOverdueAlerts } from "../use-cases/TriggerOverdueAlerts";

export class OverdueAlertMonitor {
  private timer: NodeJS.Timeout | null = null;
  private checking = false;

  constructor(private readonly triggerOverdueAlerts: TriggerOverdueAlerts) {}

  start(intervalMs = 60_000): void {
    this.stop();
    this.timer = setInterval(() => {
      this.check().catch((error) => {
        console.error("Erro ao verificar alertas de inadimplência:", error);
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async check(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      await this.triggerOverdueAlerts.execute();
    } finally {
      this.checking = false;
    }
  }
}
