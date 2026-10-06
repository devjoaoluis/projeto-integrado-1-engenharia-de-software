export enum PropertyStatus {
  CADASTRADO = "CADASTRADO",
  DISPONIVEL = "DISPONIVEL",
  VENDIDO = "VENDIDO",
  ALUGADO = "ALUGADO",
  INATIVO = "INATIVO",
}

export interface Property {
  id: string;
  title: string;
  address: string;
  neighborhood: string | null;
  bedrooms: number | null;
  description: string | null;
  price: number;
  status: PropertyStatus;
  createdAt: number;
  updatedAt: number;
}
