export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string | null;
  createdAt: number;
  updatedAt: number;
}
