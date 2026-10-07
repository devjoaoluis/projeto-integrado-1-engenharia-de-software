import { SearchPropertiesParams, SearchPropertiesResult } from "../../../shared/types/properties";
import { Property } from "../entities/Property";

export interface IPropertyRepository {
  create(property: Property): Promise<Property>;
  findById(id: string): Promise<Property | null>;
  findAll(): Promise<Property[]>;
  search(params: SearchPropertiesParams): Promise<SearchPropertiesResult>;
  update(property: Property): Promise<Property>;
  delete(id: string): Promise<void>;
}
