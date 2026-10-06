import { z } from "zod";
import { PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { SearchPropertiesResult, SearchPropertiesParams } from "../../../shared/types/properties";

export const SearchPropertiesSchema = z.object({
  q: z.string().optional(),
  neighborhood: z.union([z.string(), z.array(z.string())]).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  bedrooms: z.number().min(0).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  orderBy: z.enum(["price_asc", "price_desc", "recent"]).default("recent"),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type SearchPropertiesDTO = z.input<typeof SearchPropertiesSchema>;

export class SearchProperties {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(dto: SearchPropertiesDTO): Promise<SearchPropertiesResult> {
    const params = SearchPropertiesSchema.parse(dto);
    
    // We expect the repository to handle the search returning { items, total, limit, offset }
    // We add the search method to IPropertyRepository.
    return this.propertyRepository.search(params);
  }
}
