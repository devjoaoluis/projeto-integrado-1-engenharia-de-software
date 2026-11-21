import { GetClientProfile } from "../application/use-cases/GetClientProfile";
import { DrizzleGuarantorRepository } from "../infrastructure/repositories/DrizzleGuarantorRepository";
import { ipcMain } from "electron";
import { CreateClient, CreateClientDTO } from "../application/use-cases/CreateClient";
import { GetClient } from "../application/use-cases/GetClient";
import { ListClients } from "../application/use-cases/ListClients";
import { UpdateClient, UpdateClientDTO } from "../application/use-cases/UpdateClient";
import { DeleteClient } from "../application/use-cases/DeleteClient";
import { TerminateRental } from "../application/use-cases/TerminateRental";
import { DrizzleRentalRepository } from "../infrastructure/repositories/DrizzleRentalRepository";
import { DrizzleInspectionRepository } from "../infrastructure/repositories/DrizzleInspectionRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";

import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";

export function registerClientsIpc() {
  const clientRepo = new DrizzleClientRepository();
  const rentalRepo = new DrizzleRentalRepository();
  const inspectionRepo = new DrizzleInspectionRepository();
  const historyRepo = new DrizzlePropertyHistoryRepository();
  const propertyRepo = new DrizzlePropertyRepository();

  const guarantorRepo = new DrizzleGuarantorRepository();
  const profile = new GetClientProfile(clientRepo, guarantorRepo);
  const createClient = new CreateClient(clientRepo, guarantorRepo);
  const getClient = new GetClient(clientRepo);
  const listClients = new ListClients(clientRepo);
  const updateClient = new UpdateClient(clientRepo, guarantorRepo);
  const deleteClient = new DeleteClient(clientRepo);
  const terminateRental = new TerminateRental(rentalRepo, inspectionRepo, historyRepo, clientRepo, propertyRepo);

  ipcMain.handle("clients:profile", async (_, id: string) => profile.execute(id));

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

  ipcMain.handle("clients:terminate-contract", async (_, data: any) => {
    return await terminateRental.execute(data);
  });
}
