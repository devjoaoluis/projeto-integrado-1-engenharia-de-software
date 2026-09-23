import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface UpdateClientDTO {
  id: string;
  name?: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string | null;
}

export class UpdateClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute(dto: UpdateClientDTO): Promise<Client> {
    const client = await this.clientRepository.findById(dto.id);
    if (!client) {
      throw new Error(`Client with id ${dto.id} not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim() === "") throw new Error("Name cannot be empty");
      client.name = dto.name.trim();
    }

    if (dto.cpfCnpj !== undefined) {
      const cleanCpfCnpj = dto.cpfCnpj.trim();
      if (cleanCpfCnpj === "") throw new Error("CPF/CNPJ cannot be empty");
      if (cleanCpfCnpj !== client.cpfCnpj) {
        const existing = await this.clientRepository.findByCpfCnpj(cleanCpfCnpj);
        if (existing && existing.id !== client.id) {
          throw new Error("A client with this CPF/CNPJ already exists");
        }
      }
      client.cpfCnpj = cleanCpfCnpj;
    }

    if (dto.phone !== undefined) {
      if (dto.phone.trim() === "") throw new Error("Phone cannot be empty");
      client.phone = dto.phone.trim();
    }

    if (dto.email !== undefined) {
      client.email = dto.email ? dto.email.trim() : null;
    }

    client.updatedAt = Date.now();

    return this.clientRepository.update(client);
  }
}
