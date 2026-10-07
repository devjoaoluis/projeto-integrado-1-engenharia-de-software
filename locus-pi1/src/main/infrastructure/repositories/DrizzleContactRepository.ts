import { eq } from "drizzle-orm";
import { db } from "../database/db";
import { owners, guarantors } from "../database/schema/contacts";
import { Contact } from "../../domain/entities/Contact";
import { IContactRepository } from "../../domain/repositories/IContactRepository";

export class DrizzleContactRepository implements IContactRepository {
  constructor(private table: typeof owners | typeof guarantors) {}

  async create(contact: Contact): Promise<Contact> {
    await db.insert(this.table).values(contact);
    return contact;
  }

  async findById(id: string): Promise<Contact | null> {
    return (await db.select().from(this.table).where(eq(this.table.id, id)).get()) ?? null;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Contact | null> {
    return (await db.select().from(this.table).where(eq(this.table.cpfCnpj, cpfCnpj.replace(/\D/g, ""))).get()) ?? null;
  }

  async findAll(): Promise<Contact[]> {
    return db.select().from(this.table).orderBy(this.table.createdAt, this.table.id);
  }

  async update(contact: Contact): Promise<Contact> {
    await db.update(this.table).set({ name: contact.name, cpfCnpj: contact.cpfCnpj,
      phone: contact.phone, email: contact.email, updatedAt: contact.updatedAt }).where(eq(this.table.id, contact.id));
    return contact;
  }

  async delete(id: string): Promise<void> {
    await db.delete(this.table).where(eq(this.table.id, id));
  }
}
