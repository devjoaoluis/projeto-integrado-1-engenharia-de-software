import { randomUUID } from "crypto";
import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface CreateClientDTO {
  name: string;
  cpfCnpj: string;
  phone: string;
  email?: string | null;
}

export class CreateClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute(dto: CreateClientDTO): Promise<Client> {
    if (!dto.name || dto.name.trim() === "") {
      throw new Error("Name is required");
    }
    if (!dto.cpfCnpj || dto.cpfCnpj.trim() === "") {
      throw new Error("CPF/CNPJ is required");
    }
    if (!dto.phone || dto.phone.trim() === "") {
      throw new Error("Phone is required");
    }

    const cleanCpfCnpj = dto.cpfCnpj.trim();
    const existing = await this.clientRepository.findByCpfCnpj(cleanCpfCnpj);
    if (existing) {
      throw new Error("A client with this CPF/CNPJ already exists");
    }

    const client: Client = {
      id: randomUUID(),
      name: dto.name.trim(),
      cpfCnpj: cleanCpfCnpj,
      phone: dto.phone.trim(),
      email: dto.email ? dto.email.trim() : null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.clientRepository.create(client);
  }
}
