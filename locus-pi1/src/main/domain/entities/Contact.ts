export interface Contact {
  id: string;
  name: string;
  cpfCnpj: string | null;
  phone: string | null;
  email: string | null;
  createdAt: number;
  updatedAt: number;
}
