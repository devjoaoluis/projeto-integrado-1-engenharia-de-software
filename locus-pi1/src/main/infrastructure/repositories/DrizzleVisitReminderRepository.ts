import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../database/db";
import { visitReminders } from "../database/schema/visit-reminders";
import { VisitReminder, VisitReminderStage } from "../../domain/entities/VisitReminder";
import { IVisitReminderRepository } from "../../domain/repositories/IVisitReminderRepository";

export class DrizzleVisitReminderRepository implements IVisitReminderRepository {
  async recordTriggered(reminder: VisitReminder): Promise<VisitReminder> {
    await db
      .insert(visitReminders)
      .values({
        id: reminder.id || crypto.randomUUID(),
        visitId: reminder.visitId,
        stage: reminder.stage,
        triggeredAt: reminder.triggeredAt,
        dismissedAt: reminder.dismissedAt ?? null,
        createdAt: reminder.createdAt || Date.now(),
      })
      .onConflictDoUpdate({
        target: [visitReminders.visitId, visitReminders.stage],
        set: {
          triggeredAt: reminder.triggeredAt,
          dismissedAt: reminder.dismissedAt ?? null,
        },
      });

    return reminder;
  }

  async isTriggered(visitId: string, stage: VisitReminderStage): Promise<boolean> {
    const record = await db
      .select({ id: visitReminders.id })
      .from(visitReminders)
      .where(and(eq(visitReminders.visitId, visitId), eq(visitReminders.stage, stage)))
      .get();

    return !!record;
  }

  async dismiss(visitId: string, stage: VisitReminderStage, dismissedAt: number = Date.now()): Promise<void> {
    const existing = await db
      .select()
      .from(visitReminders)
      .where(and(eq(visitReminders.visitId, visitId), eq(visitReminders.stage, stage)))
      .get();

    if (existing) {
      await db
        .update(visitReminders)
        .set({ dismissedAt })
        .where(and(eq(visitReminders.visitId, visitId), eq(visitReminders.stage, stage)));
    } else {
      await db.insert(visitReminders).values({
        id: crypto.randomUUID(),
        visitId,
        stage,
        triggeredAt: dismissedAt,
        dismissedAt,
        createdAt: dismissedAt,
      });
    }
  }

  async findByVisitId(visitId: string): Promise<VisitReminder[]> {
    const rows = await db
      .select()
      .from(visitReminders)
      .where(eq(visitReminders.visitId, visitId))
      .all();

    return rows as VisitReminder[];
  }

  async findAll(): Promise<VisitReminder[]> {
    const rows = await db.select().from(visitReminders).all();
    return rows as VisitReminder[];
  }
}
