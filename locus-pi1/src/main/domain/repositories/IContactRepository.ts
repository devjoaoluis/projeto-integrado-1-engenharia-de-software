import { Contact } from "../entities/Contact";

export interface IContactRepository {
  create(contact: Contact): Promise<Contact>;
  findById(id: string): Promise<Contact | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Contact | null>;
  findAll(): Promise<Contact[]>;
  update(contact: Contact): Promise<Contact>;
  delete(id: string): Promise<void>;
}
