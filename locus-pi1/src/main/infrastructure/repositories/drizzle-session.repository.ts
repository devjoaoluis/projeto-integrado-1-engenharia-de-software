import { eq } from "drizzle-orm";
import { db } from "../database/db";
import { sessions } from "../database/schema/users";
import { Session } from "../../domain/entities/session.entity";
import { ISessionRepository } from "../../domain/repositories/session.repository";

export class DrizzleSessionRepository implements ISessionRepository {
  async create(session: Session): Promise<Session> {
    await db.insert(sessions).values({
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    });
    return session;
  }

  async findById(id: string): Promise<Session | null> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  private mapToDomain(row: typeof sessions.$inferSelect): Session {
    return {
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }
}
