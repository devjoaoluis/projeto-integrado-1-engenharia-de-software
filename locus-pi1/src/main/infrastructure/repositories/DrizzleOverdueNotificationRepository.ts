import { DrizzleNotificationRepository } from "./DrizzleNotificationRepository";
import { AppNotification } from "../../domain/entities/AppNotification";
import { OverdueNotification } from "../../domain/entities/OverdueRent";
import {
  IOverdueNotificationRepository,
  OverdueNotificationFilter,
} from "../../domain/repositories/IOverdueNotificationRepository";

export class DrizzleOverdueNotificationRepository implements IOverdueNotificationRepository {
  private readonly notifications = new DrizzleNotificationRepository();

  async create(notification: OverdueNotification): Promise<OverdueNotification> {
    await this.notifications.createIfAbsent({
      id: notification.id,
      category: "OVERDUE",
      title: "Locatário em atraso",
      message: notification.message,
      target: `/pagamentos?tenantId=${encodeURIComponent(notification.tenantId)}`,
      entityId: notification.rentalId,
      data: { ...notification },
      createdAt: notification.createdAt,
      readAt: null,
      deletedAt: null,
    });
    return notification;
  }

  async findByRentalAndMonth(
    rentalId: string,
    referenceMonth: string
  ): Promise<OverdueNotification[]> {
    return this.list({ rentalId, referenceMonth });
  }

  async findLatestForRentalMonth(
    rentalId: string,
    referenceMonth: string
  ): Promise<OverdueNotification | null> {
    return (await this.findByRentalAndMonth(rentalId, referenceMonth))[0] ?? null;
  }

  async list(filter?: OverdueNotificationFilter): Promise<OverdueNotification[]> {
    const records = await this.notifications.list(100);
    return records
      .filter((record) => record.category === "OVERDUE")
      .map((record) => this.toOverdueNotification(record))
      .filter((record) =>
        (!filter?.rentalId || record.rentalId === filter.rentalId)
        && (!filter?.tenantId || record.tenantId === filter.tenantId)
        && (!filter?.referenceMonth || record.referenceMonth === filter.referenceMonth)
        && (!filter?.since || record.createdAt >= filter.since)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  private toOverdueNotification(record: AppNotification): OverdueNotification {
    const data = record.data as unknown as OverdueNotification;
    return {
      ...data,
      id: typeof data.id === "string" ? data.id : record.id,
      message: record.message,
      createdAt: record.createdAt,
    };
  }
}

