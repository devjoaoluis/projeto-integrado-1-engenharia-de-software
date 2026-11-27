import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../database/db";
import { appNotifications } from "../database/schema/app-notifications";
import { AppNotification } from "../../domain/entities/AppNotification";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";

function fromRow(row: typeof appNotifications.$inferSelect): AppNotification {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    message: row.message,
    target: row.target,
    entityId: row.entityId,
    data: JSON.parse(row.dataJson) as Record<string, unknown>,
    createdAt: row.createdAt,
    readAt: row.readAt,
    deletedAt: row.deletedAt,
  };
}

export class DrizzleNotificationRepository implements INotificationRepository {
  async createIfAbsent(
    notification: AppNotification
  ): Promise<{ created: boolean; notification: AppNotification }> {
    const inserted = await db
      .insert(appNotifications)
      .values({
        id: notification.id,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        target: notification.target,
        entityId: notification.entityId,
        dataJson: JSON.stringify(notification.data),
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        deletedAt: notification.deletedAt,
      })
      .onConflictDoNothing()
      .returning()
      .get();

    if (inserted) {
      await db.run(sql`
        DELETE FROM app_notifications
        WHERE id NOT IN (
          SELECT id FROM app_notifications
          ORDER BY created_at DESC
          LIMIT 100
        )
      `);
      return { created: true, notification: fromRow(inserted) };
    }

    const existing = await this.findById(notification.id);
    if (!existing) throw new Error(`Notificação duplicada não encontrada: ${notification.id}`);
    return { created: false, notification: existing };
  }

  async findById(id: string): Promise<AppNotification | null> {
    const row = await db
      .select()
      .from(appNotifications)
      .where(eq(appNotifications.id, id))
      .get();
    return row ? fromRow(row) : null;
  }

  async list(limit = 100): Promise<AppNotification[]> {
    const rows = await db
      .select()
      .from(appNotifications)
      .where(isNull(appNotifications.deletedAt))
      .orderBy(desc(appNotifications.createdAt))
      .limit(Math.min(Math.max(limit, 1), 100))
      .all();
    return rows.map(fromRow);
  }

  async markRead(id: string, readAt: number): Promise<boolean> {
    const updated = await db
      .update(appNotifications)
      .set({ readAt })
      .where(and(eq(appNotifications.id, id), isNull(appNotifications.deletedAt)))
      .returning({ id: appNotifications.id })
      .get();
    return Boolean(updated);
  }

  async markAllRead(readAt: number): Promise<void> {
    await db
      .update(appNotifications)
      .set({ readAt })
      .where(and(isNull(appNotifications.readAt), isNull(appNotifications.deletedAt)))
      .run();
  }

  async delete(id: string, deletedAt: number): Promise<void> {
    await db
      .update(appNotifications)
      .set({ deletedAt })
      .where(eq(appNotifications.id, id))
      .run();
  }

  async clear(deletedAt: number): Promise<void> {
    await db
      .update(appNotifications)
      .set({ deletedAt })
      .where(isNull(appNotifications.deletedAt))
      .run();
  }
}
