import { IClientRepository } from "../../domain/repositories/IClientRepository";

export class DeleteClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute(id: string): Promise<void> {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }

    await this.clientRepository.delete(id);
  }
}
