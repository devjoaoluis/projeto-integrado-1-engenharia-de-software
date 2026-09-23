import { eq } from "drizzle-orm";
import { db } from "../database/db";
import { properties } from "../database/schema/properties";
import { Property, PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export class DrizzlePropertyRepository implements IPropertyRepository {
  async create(property: Property): Promise<Property> {
    await db.insert(properties).values({
      id: property.id,
      title: property.title,
      address: property.address,
      description: property.description,
      price: property.price,
      status: property.status,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    });
    return property;
  }

  async findById(id: string): Promise<Property | null> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

  async findAll(): Promise<Property[]> {
    const results = await db.select().from(properties).orderBy(properties.createdAt);
    return results.map((row) => this.mapToDomain(row));
  }

  async update(property: Property): Promise<Property> {
    await db
      .update(properties)
      .set({
        title: property.title,
        address: property.address,
        description: property.description,
        price: property.price,
        status: property.status,
        updatedAt: property.updatedAt,
      })
      .where(eq(properties.id, property.id));
    return property;
  }

  async delete(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  private mapToDomain(row: typeof properties.$inferSelect): Property {
    return {
      id: row.id,
      title: row.title,
      address: row.address,
      description: row.description,
      price: row.price,
      status: row.status as PropertyStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
