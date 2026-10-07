import { IGuarantorRepository } from "../../domain/repositories/IGuarantorRepository";
import { requiredText, contactDocument, optionalEmail } from "./contactValidation";
import { Client, ClientType } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface UpdateClientDTO {
  id: string;
  type?: ClientType;
  guarantorId?: string | null;
  name?: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string | null;
}

export class UpdateClient {
  constructor(private clientRepository: IClientRepository, private guarantorRepository?: IGuarantorRepository) {}

  async execute(dto: UpdateClientDTO): Promise<Client> {
    requiredText(dto?.id, "Client id");
    const found = await this.clientRepository.findById(dto.id);
    const client = found ? { ...found } : null;
    if (!client) {
      throw new Error(`Client with id ${dto.id} not found`);
    }

    if (dto.name !== undefined) {
      client.name = requiredText(dto.name, "Name");
    }

    if (dto.cpfCnpj !== undefined) {
      const cleanCpfCnpj = contactDocument(dto.cpfCnpj);
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
      client.phone = requiredText(dto.phone, "Phone");
    }

    if (dto.email !== undefined) {
      client.email = optionalEmail(dto.email);
    }

    if (dto.type !== undefined) {
      if (!["TENANT", "INTERESTED"].includes(dto.type)) throw new Error("Invalid client type");
      client.type = dto.type;
    }
    if (dto.guarantorId !== undefined) {
      if (dto.guarantorId !== null) {
        requiredText(dto.guarantorId, "Guarantor id");
        if (!this.guarantorRepository || !await this.guarantorRepository.findById(dto.guarantorId)) throw new Error("Guarantor not found");
      }
      client.guarantorId = dto.guarantorId;
    }
    client.updatedAt = Date.now();

    return this.clientRepository.update(client);
  }
}
