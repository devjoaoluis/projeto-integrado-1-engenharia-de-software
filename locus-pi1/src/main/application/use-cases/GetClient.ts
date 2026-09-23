import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export class GetClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute(id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }
    return client;
  }
}
