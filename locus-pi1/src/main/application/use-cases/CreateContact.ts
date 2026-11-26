import { randomUUID } from "crypto";
import { Contact } from "../../domain/entities/Contact";
import { IContactRepository } from "../../domain/repositories/IContactRepository";
import { requiredText, optionalContactDocument, optionalText, optionalEmail } from "./contactValidation";

export interface CreateContactDTO {
  name: string;
  cpfCnpj?: string | null;
  phone?: string | null;
  email?: string | null;
}

export class CreateContact {
  constructor(private repository: IContactRepository) {}

  async execute(dto: CreateContactDTO): Promise<Contact> {
    if (!dto) throw new Error("Contact data is required");
    const name = requiredText(dto.name, "Name");
    const cpfCnpj = optionalContactDocument(dto.cpfCnpj);
    const phone = optionalText(dto.phone, "Phone");
    const email = optionalEmail(dto.email);
    if (cpfCnpj && await this.repository.findByCpfCnpj(cpfCnpj)) throw new Error("A contact with this CPF/CNPJ already exists");
    const now = Date.now();
    return this.repository.create({ id: randomUUID(), name, cpfCnpj: cpfCnpj ?? "", phone: phone ?? "", email, createdAt: now, updatedAt: now });
  }
}
