import { IContactRepository } from "../../domain/repositories/IContactRepository";
import { requiredText } from "./contactValidation";

export class GetContact {
  constructor(private repository: IContactRepository) {}

  async execute(id: string) {
    requiredText(id, "Contact id");
    const contact = await this.repository.findById(id);
    if (!contact) throw new Error(`Contact with id ${id} not found`);
    return contact;
  }
}
