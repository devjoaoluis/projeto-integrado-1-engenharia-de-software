import { and, desc, eq, gte } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../database/db";
import { overdueNotifications } from "../database/schema/overdue-notifications";
import { OverdueNotification } from "../../domain/entities/OverdueRent";
import {
  IOverdueNotificationRepository,
  OverdueNotificationFilter,
} from "../../domain/repositories/IOverdueNotificationRepository";

export class DrizzleOverdueNotificationRepository implements IOverdueNotificationRepository {
  async create(notification: OverdueNotification): Promise<OverdueNotification> {
    const record = {
      id: notification.id || crypto.randomUUID(),
      rentalId: notification.rentalId,
      contractId: notification.contractId ?? null,
      tenantId: notification.tenantId,
      referenceMonth: notification.referenceMonth,
      dueDate: notification.dueDate,
      daysOverdue: notification.daysOverdue,
      originalAmount: notification.originalAmount,
      interestAmount: notification.interestAmount,
      fineAmount: notification.fineAmount,
      totalAmount: notification.totalAmount,
      message: notification.message,
      channel: notification.channel || "SYSTEM",
      createdAt: notification.createdAt || Date.now(),
    };

    await db.insert(overdueNotifications).values(record);
    return record as OverdueNotification;
  }

  async findByRentalAndMonth(
    rentalId: string,
    referenceMonth: string
  ): Promise<OverdueNotification[]> {
    const rows = await db
      .select()
      .from(overdueNotifications)
      .where(
        and(
          eq(overdueNotifications.rentalId, rentalId),
          eq(overdueNotifications.referenceMonth, referenceMonth)
        )
      )
      .orderBy(desc(overdueNotifications.createdAt))
      .all();

    return rows as OverdueNotification[];
  }

  async findLatestForRentalMonth(
    rentalId: string,
    referenceMonth: string
  ): Promise<OverdueNotification | null> {
    const row = await db
      .select()
      .from(overdueNotifications)
      .where(
        and(
          eq(overdueNotifications.rentalId, rentalId),
          eq(overdueNotifications.referenceMonth, referenceMonth)
        )
      )
      .orderBy(desc(overdueNotifications.createdAt))
      .limit(1)
      .get();

    return (row as OverdueNotification) ?? null;
  }

  async list(filter?: OverdueNotificationFilter): Promise<OverdueNotification[]> {
    const conditions = [];

    if (filter?.rentalId) {
      conditions.push(eq(overdueNotifications.rentalId, filter.rentalId));
    }
    if (filter?.tenantId) {
      conditions.push(eq(overdueNotifications.tenantId, filter.tenantId));
    }
    if (filter?.referenceMonth) {
      conditions.push(eq(overdueNotifications.referenceMonth, filter.referenceMonth));
    }
    if (filter?.since) {
      conditions.push(gte(overdueNotifications.createdAt, filter.since));
    }

    const query = db.select().from(overdueNotifications);

    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(overdueNotifications.createdAt)).all()
      : await query.orderBy(desc(overdueNotifications.createdAt)).all();

    return rows as OverdueNotification[];
  }
}

