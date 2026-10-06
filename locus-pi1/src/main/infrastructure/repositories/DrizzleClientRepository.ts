import { eq } from "drizzle-orm";
import { db } from "../database/db";
import { clients } from "../database/schema/clients";
import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export class DrizzleClientRepository implements IClientRepository {
  async create(client: Client): Promise<Client> {
    await db.insert(clients).values({
      id: client.id,
      name: client.name,
      cpfCnpj: client.cpfCnpj,
      phone: client.phone,
      email: client.email,
      type: client.type,
      guarantorId: client.guarantorId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    });
    return client;
  }

  async findById(id: string): Promise<Client | null> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Client | null> {
    const result = await db.select().from(clients).where(eq(clients.cpfCnpj, cpfCnpj.replace(/\D/g, ""))).limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

  async findAll(): Promise<Client[]> {
    const results = await db.select().from(clients).orderBy(clients.createdAt);
    return results.map((row) => this.mapToDomain(row));
  }

  async update(client: Client): Promise<Client> {
    await db
      .update(clients)
      .set({
        name: client.name,
        cpfCnpj: client.cpfCnpj,
        phone: client.phone,
        email: client.email,
        type: client.type,
        guarantorId: client.guarantorId,
        updatedAt: client.updatedAt,
      })
      .where(eq(clients.id, client.id));
    return client;
  }

  async delete(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  private mapToDomain(row: typeof clients.$inferSelect): Client {
    return {
      id: row.id,
      name: row.name,
      cpfCnpj: row.cpfCnpj,
      phone: row.phone,
      email: row.email,
      type: row.type,
      guarantorId: row.guarantorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
