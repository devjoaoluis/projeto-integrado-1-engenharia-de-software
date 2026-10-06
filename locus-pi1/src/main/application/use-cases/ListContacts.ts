import { IContactRepository } from "../../domain/repositories/IContactRepository";

export class ListContacts {
  constructor(private repository: IContactRepository) {}

  async execute() { return this.repository.findAll(); }
}
