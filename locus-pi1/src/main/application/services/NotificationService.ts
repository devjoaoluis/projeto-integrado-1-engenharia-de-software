import {
  AppNotification,
  NewAppNotification,
} from "../../domain/entities/AppNotification";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";

export interface INativeNotificationPublisher {
  show(
    notification: AppNotification,
    onClick: () => void,
    onFailure: (reason: string) => void
  ): boolean;
}

export interface INotificationHost {
  isAppFocused(): boolean;
  broadcastChanged(): void;
  broadcastNativeUnavailable(): void;
  navigateTo(target: string): Promise<void> | void;
}

export class NotificationService {
  private readonly recentIds = new Map<string, number>();
  private nativeUnavailableReported = false;

  constructor(
    private readonly repository: INotificationRepository,
    private readonly nativePublisher: INativeNotificationPublisher,
    private readonly host: INotificationHost,
    private readonly deduplicationWindowMs = 60_000,
    private readonly now: () => number = Date.now
  ) {}

  async publish(input: NewAppNotification): Promise<{
    created: boolean;
    notification: AppNotification;
  }> {
    const now = input.createdAt ?? this.now();
    this.pruneRecentIds(now);

    const recentTime = this.recentIds.get(input.id);
    if (recentTime !== undefined && now - recentTime < this.deduplicationWindowMs) {
      const recent = await this.repository.findById(input.id);
      if (recent) return { created: false, notification: recent };
    }

    const candidate: AppNotification = {
      ...input,
      createdAt: now,
      readAt: null,
      deletedAt: null,
    };
    const result = await this.repository.createIfAbsent(candidate);
    this.recentIds.set(input.id, now);

    if (!result.created) return result;

    this.host.broadcastChanged();
    // Em foco, os eventos ficam apenas no sino; o modo Foco do Windows é respeitado.
    if (!this.host.isAppFocused()) {
      const reportUnavailable = (reason: string) => {
        console.error("Notificação nativa indisponível:", reason);
        if (this.nativeUnavailableReported) return;
        this.nativeUnavailableReported = true;
        this.host.broadcastNativeUnavailable();
      };
      const shown = this.nativePublisher.show(
        result.notification,
        () => {
          this.openFromNative(result.notification).catch((error) => {
            console.error("Não foi possível abrir a notificação nativa:", error);
          });
        },
        reportUnavailable
      );
      if (!shown) reportUnavailable("O sistema não oferece suporte a notificações.");
    }

    return result;
  }

  async list(): Promise<AppNotification[]> {
    return this.repository.list(100);
  }

  async markRead(id: string): Promise<boolean> {
    const updated = await this.repository.markRead(id, this.now());
    if (updated) this.host.broadcastChanged();
    return updated;
  }

  async markAllRead(): Promise<void> {
    await this.repository.markAllRead(this.now());
    this.host.broadcastChanged();
  }

  async clear(): Promise<void> {
    await this.repository.clear(this.now());
    this.host.broadcastChanged();
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id, this.now());
    this.host.broadcastChanged();
  }

  private async openFromNative(notification: AppNotification): Promise<void> {
    await this.repository.markRead(notification.id, this.now());
    this.host.broadcastChanged();
    await this.host.navigateTo(notification.target);
  }

  private pruneRecentIds(now: number): void {
    for (const [id, timestamp] of this.recentIds) {
      if (now - timestamp >= this.deduplicationWindowMs) this.recentIds.delete(id);
    }
  }
}
