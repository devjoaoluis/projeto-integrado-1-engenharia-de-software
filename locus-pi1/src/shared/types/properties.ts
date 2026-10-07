// Shared types between main and renderer processes
export enum PropertyStatus {
  CADASTRADO = "CADASTRADO",
  DISPONIVEL = "DISPONIVEL",
  VENDIDO = "VENDIDO",
  ALUGADO = "ALUGADO",
  INATIVO = "INATIVO",
}

export interface PropertyListItem {
  id: string;
  title: string;
  address: string;
  neighborhood: string | null;
  bedrooms: number | null;
  price: number;
  status: PropertyStatus;
  createdAt: number;
}

export interface SearchPropertiesParams {
  q?: string;
  neighborhood?: string | string[];
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  status?: PropertyStatus;
  orderBy?: "price_asc" | "price_desc" | "recent";
  page?: number;
  limit?: number;
}

export interface SearchPropertiesResult {
  items: PropertyListItem[];
  total: number;
  limit: number;
  offset: number;
}
