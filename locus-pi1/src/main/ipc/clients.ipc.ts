import { ipcMain } from "electron";
import { CreateClient, CreateClientDTO } from "../application/use-cases/CreateClient";
import { GetClient } from "../application/use-cases/GetClient";
import { ListClients } from "../application/use-cases/ListClients";
import { UpdateClient, UpdateClientDTO } from "../application/use-cases/UpdateClient";
import { DeleteClient } from "../application/use-cases/DeleteClient";

import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";

export function registerClientsIpc() {
  const clientRepo = new DrizzleClientRepository();

  const createClient = new CreateClient(clientRepo);
  const getClient = new GetClient(clientRepo);
  const listClients = new ListClients(clientRepo);
  const updateClient = new UpdateClient(clientRepo);
  const deleteClient = new DeleteClient(clientRepo);

  ipcMain.handle("clients:create", async (_, data: CreateClientDTO) => {
    return await createClient.execute(data);
  });

  ipcMain.handle("clients:get", async (_, id: string) => {
    return await getClient.execute(id);
  });

  ipcMain.handle("clients:list", async () => {
    return await listClients.execute();
  });

  ipcMain.handle("clients:update", async (_, data: UpdateClientDTO) => {
    return await updateClient.execute(data);
  });

  ipcMain.handle("clients:delete", async (_, id: string) => {
    await deleteClient.execute(id);
    return { success: true };
  });
}
