import { PropertyMedia } from "../entities/PropertyMedia";

export interface IPropertyMediaRepository {
  create(media: PropertyMedia): Promise<PropertyMedia>;
  findById(id: string): Promise<PropertyMedia | null>;
  findByPropertyId(propertyId: string): Promise<PropertyMedia[]>;
  delete(id: string): Promise<void>;
  deleteByPropertyId(propertyId: string): Promise<void>;
}
