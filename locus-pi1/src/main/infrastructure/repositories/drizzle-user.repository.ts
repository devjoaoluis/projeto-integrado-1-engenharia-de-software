import { eq } from "drizzle-orm";
import { db } from "../database/db";
import { users } from "../database/schema/users";
import { User } from "../../domain/entities/user.entity";
import { IUserRepository } from "../../domain/repositories/user.repository";

export class DrizzleUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

    async findByEmail(email: string): Promise<User | null> {
    const emailNormalizado = email.trim().toLowerCase();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalizado))
      .limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

  async create(user: User): Promise<User> {
    await db.insert(users).values({
      id: user.id,
      nome: user.nome,
      email: user.email,
      senhaHash: user.senhaHash,
      perguntaSeguranca: user.perguntaSeguranca,
      respostaHash: user.respostaHash,
      criadoEm: user.criadoEm,
      atualizadoEm: user.atualizadoEm,
    });
    return user;
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        senhaHash: newPasswordHash,
        atualizadoEm: Date.now(),
      })
      .where(eq(users.id, userId));
  }

  async count(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  private mapToDomain(row: typeof users.$inferSelect): User {
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      senhaHash: row.senhaHash,
      perguntaSeguranca: row.perguntaSeguranca,
      respostaHash: row.respostaHash,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    };
  }
}