import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export class ListClients {
  constructor(private clientRepository: IClientRepository) {}

  async execute(): Promise<Client[]> {
    return this.clientRepository.findAll();
  }
}
