import { IContactRepository } from "../../domain/repositories/IContactRepository";
import { GetContact } from "./GetContact";

export class DeleteContact {
  constructor(private repository: IContactRepository) {}

  async execute(id: string): Promise<void> {
    await new GetContact(this.repository).execute(id);
    await this.repository.delete(id);
  }
}
