import { UpdateRentalPrerequisites, UpdateRentalPrerequisitesDTO } from "../application/use-cases/UpdateRentalPrerequisites";
import { ipcMain } from "electron";
import { CreateRental, CreateRentalDTO } from "../application/use-cases/CreateRental";
import { GetRental } from "../application/use-cases/GetRental";
import { ListRentals } from "../application/use-cases/ListRentals";
import { ReleaseRentalKeys } from "../application/use-cases/ReleaseRentalKeys";
import { DrizzleRentalRepository } from "../infrastructure/repositories/DrizzleRentalRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { CancelRental } from "../application/use-cases/CancelRental";

export function registerRentalsIpc() {
  const rentalRepo = new DrizzleRentalRepository();
  const createRental = new CreateRental(rentalRepo, new DrizzlePropertyRepository(), new DrizzleClientRepository());
  const getRental = new GetRental(rentalRepo);
  const listRentals = new ListRentals(rentalRepo);
  const updatePrerequisites = new UpdateRentalPrerequisites(rentalRepo);
  const releaseKeys = new ReleaseRentalKeys(rentalRepo);
  const cancelRental = new CancelRental(rentalRepo);

  ipcMain.handle("rentals:create", async (_, data: CreateRentalDTO) => createRental.execute(data));
  ipcMain.handle("rentals:get", async (_, id: string) => getRental.execute(id));
  ipcMain.handle("rentals:list", async () => listRentals.execute());
  ipcMain.handle("rentals:update-prerequisites", async (_, data: UpdateRentalPrerequisitesDTO) => updatePrerequisites.execute(data));
  ipcMain.handle("rentals:release-keys", async (_, id: string) => releaseKeys.execute(id));
  ipcMain.handle("rentals:cancel", async (_, id: string) => { await cancelRental.execute(id); return { success: true }; });
}
