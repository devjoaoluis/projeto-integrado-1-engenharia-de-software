import { Client } from "../entities/Client";

export interface IClientRepository {
  create(client: Client): Promise<Client>;
  findById(id: string): Promise<Client | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Client | null>;
  findAll(): Promise<Client[]>;
  update(client: Client): Promise<Client>;
  delete(id: string): Promise<void>;
}
