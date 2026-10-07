import { IGuarantorRepository } from "../../domain/repositories/IGuarantorRepository";
import { requiredText, contactDocument, optionalEmail } from "./contactValidation";
import { randomUUID } from "crypto";
import { Client, ClientType } from "../../domain/entities/Client";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface CreateClientDTO {
  type?: ClientType;
  guarantorId?: string | null;
  name: string;
  cpfCnpj: string;
  phone: string;
  email?: string | null;
}

export class CreateClient {
  constructor(private clientRepository: IClientRepository, private guarantorRepository?: IGuarantorRepository) {}

  async execute(dto: CreateClientDTO): Promise<Client> {
    if (!dto) throw new Error("Client data is required");
    const name = requiredText(dto.name, "Name");
    const cleanCpfCnpj = contactDocument(dto.cpfCnpj);
    const phone = requiredText(dto.phone, "Phone");
    const email = optionalEmail(dto.email);
    const type = dto.type ?? "INTERESTED";
    if (!["TENANT", "INTERESTED"].includes(type)) throw new Error("Invalid client type");
    const guarantorId = dto.guarantorId ?? null;
    if (guarantorId !== null) {
      requiredText(guarantorId, "Guarantor id");
      if (!this.guarantorRepository || !await this.guarantorRepository.findById(guarantorId)) throw new Error("Guarantor not found");
    }

    const existing = await this.clientRepository.findByCpfCnpj(cleanCpfCnpj);
    if (existing) {
      throw new Error("A client with this CPF/CNPJ already exists");
    }

    const client: Client = {
      id: randomUUID(),
      name,
      type,
      guarantorId,
      cpfCnpj: cleanCpfCnpj,
      phone,
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.clientRepository.create(client);
  }
}
