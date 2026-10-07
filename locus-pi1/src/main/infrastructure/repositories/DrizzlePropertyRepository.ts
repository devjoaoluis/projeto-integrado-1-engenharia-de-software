import { rentals } from "../database/schema/rentals";
import { eq, and, gte, lte, desc, asc, inArray, sql } from "drizzle-orm";
import { SearchPropertiesParams, SearchPropertiesResult, PropertyStatus as SearchPropertyStatus } from "../../../shared/types/properties";
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
      neighborhood: property.neighborhood,
      bedrooms: property.bedrooms,
      description: property.description,
      price: property.price,
      status: property.status,
      searchNormalized: this.normalizeText(`${property.title} ${property.address} ${property.neighborhood || ""}`),
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

  async search(params: SearchPropertiesParams): Promise<SearchPropertiesResult> {
    const {
      q, neighborhood, priceMin, priceMax, bedrooms, status,
      orderBy = "recent", page = 1, limit = 20
    } = params;

    const offset = (page - 1) * limit;
    const conditions = [];

    if (q) {
      const escapedQ = q.replace(/[%_]/g, "\\$&");
      const terms = this.normalizeText(escapedQ).split(/\s+/).filter(Boolean);
      for (const term of terms) {
        conditions.push(sql`${properties.searchNormalized} LIKE ${"%" + term + "%"} ESCAPE '\\'`);
      }
    }

    if (neighborhood) {
      if (Array.isArray(neighborhood) && neighborhood.length > 0) {
        conditions.push(inArray(properties.neighborhood, neighborhood));
      } else if (typeof neighborhood === "string") {
        conditions.push(eq(properties.neighborhood, neighborhood));
      }
    }

    if (priceMin !== undefined) conditions.push(gte(properties.price, priceMin));
    if (priceMax !== undefined) conditions.push(lte(properties.price, priceMax));
    if (bedrooms !== undefined) conditions.push(gte(properties.bedrooms, bedrooms));
    if (status !== undefined) conditions.push(eq(properties.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderClause;
    if (orderBy === "price_asc") {
      orderClause = [asc(properties.price), asc(properties.id)];
    } else if (orderBy === "price_desc") {
      orderClause = [desc(properties.price), asc(properties.id)];
    } else {
      orderClause = [desc(properties.createdAt), asc(properties.id)];
    }

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(properties).where(whereClause);
    const total = totalResult[0].count;

    const results = await db.select({
      id: properties.id,
      title: properties.title,
      address: properties.address,
      neighborhood: properties.neighborhood,
      bedrooms: properties.bedrooms,
      price: properties.price,
      status: properties.status,
      createdAt: properties.createdAt
    })
    .from(properties)
    .where(whereClause)
    .orderBy(...orderClause)
    .limit(limit)
    .offset(offset);

    // Map to domain or return as is. Let's return as partial.
    return {
      items: results.map(item => ({ ...item, status: item.status as SearchPropertyStatus })),
      total,
      limit,
      offset
    };
  }

  async update(property: Property): Promise<Property> {
    if (property.status !== PropertyStatus.ALUGADO && await db.select({ id: rentals.id }).from(rentals)
      .where(eq(rentals.propertyId, property.id)).limit(1).get()) {
      throw new Error("A property with a rental must keep ALUGADO status");
    }
    await db
      .update(properties)
      .set({
        title: property.title,
        address: property.address,
        neighborhood: property.neighborhood,
        bedrooms: property.bedrooms,
        description: property.description,
        price: property.price,
        status: property.status,
        searchNormalized: this.normalizeText(`${property.title} ${property.address} ${property.neighborhood || ""}`),
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
      neighborhood: row.neighborhood,
      bedrooms: row.bedrooms,
      description: row.description,
      price: row.price,
      status: row.status as PropertyStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private normalizeText(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
}
