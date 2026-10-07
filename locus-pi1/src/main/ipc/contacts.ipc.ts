import { ipcMain } from "electron";
import { CreateContact, CreateContactDTO } from "../application/use-cases/CreateContact";
import { UpdateContact, UpdateContactDTO } from "../application/use-cases/UpdateContact";
import { GetContact } from "../application/use-cases/GetContact";
import { ListContacts } from "../application/use-cases/ListContacts";
import { DeleteContact } from "../application/use-cases/DeleteContact";
import { DrizzleOwnerRepository } from "../infrastructure/repositories/DrizzleOwnerRepository";
import { DrizzleGuarantorRepository } from "../infrastructure/repositories/DrizzleGuarantorRepository";

export function registerContactsIpc() {
  for (const [channel, repository] of [
    ["owners", new DrizzleOwnerRepository()],
    ["guarantors", new DrizzleGuarantorRepository()],
  ] as const) {
    const create = new CreateContact(repository);
    const update = new UpdateContact(repository);
    const get = new GetContact(repository);
    const list = new ListContacts(repository);
    const remove = new DeleteContact(repository);
    ipcMain.handle(`${channel}:create`, async (_, data: CreateContactDTO) => create.execute(data));
    ipcMain.handle(`${channel}:update`, async (_, data: UpdateContactDTO) => update.execute(data));
    ipcMain.handle(`${channel}:get`, async (_, id: string) => get.execute(id));
    ipcMain.handle(`${channel}:list`, async () => list.execute());
    ipcMain.handle(`${channel}:delete`, async (_, id: string) => { await remove.execute(id); return { success: true }; });
  }
}
