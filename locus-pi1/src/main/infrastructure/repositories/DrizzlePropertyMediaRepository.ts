import { eq } from "drizzle-orm";
import { db } from "../database/db";
import { propertyMedia } from "../database/schema/properties";
import { PropertyMedia, MediaType } from "../../domain/entities/PropertyMedia";
import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";

export class DrizzlePropertyMediaRepository implements IPropertyMediaRepository {
  async create(media: PropertyMedia): Promise<PropertyMedia> {
    await db.insert(propertyMedia).values({
      id: media.id,
      propertyId: media.propertyId,
      type: media.type,
      fileName: media.fileName,
      filePath: media.filePath,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt,
    });
    return media;
  }

  async findById(id: string): Promise<PropertyMedia | null> {
    const result = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id)).limit(1);
    if (!result || result.length === 0) return null;
    return this.mapToDomain(result[0]);
  }

  async findByPropertyId(propertyId: string): Promise<PropertyMedia[]> {
    const results = await db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, propertyId));
    return results.map((row) => this.mapToDomain(row));
  }

  async delete(id: string): Promise<void> {
    await db.delete(propertyMedia).where(eq(propertyMedia.id, id));
  }

  async deleteByPropertyId(propertyId: string): Promise<void> {
    await db.delete(propertyMedia).where(eq(propertyMedia.propertyId, propertyId));
  }

  private mapToDomain(row: typeof propertyMedia.$inferSelect): PropertyMedia {
    return {
      id: row.id,
      propertyId: row.propertyId,
      type: row.type as MediaType,
      fileName: row.fileName,
      filePath: row.filePath,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
    };
  }
}
