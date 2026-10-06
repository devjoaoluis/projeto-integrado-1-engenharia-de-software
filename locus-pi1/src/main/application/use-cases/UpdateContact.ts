import { Contact } from "../../domain/entities/Contact";
import { IContactRepository } from "../../domain/repositories/IContactRepository";
import { CreateContactDTO } from "./CreateContact";
import { requiredText, contactDocument, optionalEmail } from "./contactValidation";

export interface UpdateContactDTO extends Partial<CreateContactDTO> { id: string; }

export class UpdateContact {
  constructor(private repository: IContactRepository) {}

  async execute(dto: UpdateContactDTO): Promise<Contact> {
    const id = requiredText(dto?.id, "Contact id");
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error(`Contact with id ${id} not found`);
    const contact = { ...existing };
    if (dto.name !== undefined) contact.name = requiredText(dto.name, "Name");
    if (dto.phone !== undefined) contact.phone = requiredText(dto.phone, "Phone");
    if (dto.email !== undefined) contact.email = optionalEmail(dto.email);
    if (dto.cpfCnpj !== undefined) {
      const cpfCnpj = contactDocument(dto.cpfCnpj);
      const duplicate = await this.repository.findByCpfCnpj(cpfCnpj);
      if (duplicate && duplicate.id !== id) throw new Error("A contact with this CPF/CNPJ already exists");
      contact.cpfCnpj = cpfCnpj;
    }
    contact.updatedAt = Date.now();
    return this.repository.update(contact);
  }
}
