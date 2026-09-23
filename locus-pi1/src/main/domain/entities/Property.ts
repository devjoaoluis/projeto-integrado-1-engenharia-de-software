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
  description: string | null;
  price: number;
  status: PropertyStatus;
  createdAt: number;
  updatedAt: number;
}
