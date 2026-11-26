import { UpdateRentalPrerequisites, UpdateRentalPrerequisitesDTO } from "../application/use-cases/UpdateRentalPrerequisites";
import { ipcMain } from "electron";
import { CreateRental, CreateRentalDTO } from "../application/use-cases/CreateRental";
import { GetRental } from "../application/use-cases/GetRental";
import { ListRentals } from "../application/use-cases/ListRentals";
import { ReleaseRentalKeys } from "../application/use-cases/ReleaseRentalKeys";
import { DrizzleRentalRepository } from "../infrastructure/repositories/DrizzleRentalRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { DrizzleInspectionRepository } from "../infrastructure/repositories/DrizzleInspectionRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { CancelRental, CancelRentalOptions } from "../application/use-cases/CancelRental";
import { GetRentalTerminationSummary } from "../application/use-cases/GetRentalTerminationSummary";
import { TerminateRental, TerminateRentalDTO } from "../application/use-cases/TerminateRental";
import { ListPayments } from "../application/use-cases/ListPayments";

export function registerRentalsIpc() {
  const rentalRepo = new DrizzleRentalRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const clientRepo = new DrizzleClientRepository();
  const inspectionRepo = new DrizzleInspectionRepository();
  const historyRepo = new DrizzlePropertyHistoryRepository();

  const createRental = new CreateRental(rentalRepo, propertyRepo, clientRepo);
  const getRental = new GetRental(rentalRepo);
  const listRentals = new ListRentals(rentalRepo);
  const updatePrerequisites = new UpdateRentalPrerequisites(rentalRepo);
  const releaseKeys = new ReleaseRentalKeys(rentalRepo, inspectionRepo, historyRepo);
  const cancelRental = new CancelRental(rentalRepo, inspectionRepo, historyRepo);
  const getTerminationSummary = new GetRentalTerminationSummary(rentalRepo, historyRepo, inspectionRepo, clientRepo, propertyRepo);
  const terminateRental = new TerminateRental(rentalRepo, inspectionRepo, historyRepo, clientRepo, propertyRepo);
  const listPayments = new ListPayments(rentalRepo, historyRepo, clientRepo, propertyRepo);

  ipcMain.handle("rentals:create", async (_, data: CreateRentalDTO) => createRental.execute(data));
  ipcMain.handle("rentals:get", async (_, id: string) => getRental.execute(id));
  ipcMain.handle("rentals:list", async () => listRentals.execute());
  ipcMain.handle("rentals:update-prerequisites", async (_, data: UpdateRentalPrerequisitesDTO) => updatePrerequisites.execute(data));
  ipcMain.handle("rentals:release-keys", async (_, id: string) => releaseKeys.execute(id));
  ipcMain.handle("rentals:get-termination-summary", async (_, id: string) => getTerminationSummary.execute(id));
  ipcMain.handle("rentals:terminate", async (_, data: TerminateRentalDTO | string) => terminateRental.execute(data));
  ipcMain.handle("rentals:cancel", async (_, id: string, options?: CancelRentalOptions) => {
    await terminateRental.execute({ rentalId: id, ...options });
    return { success: true };
  });

  ipcMain.handle("payments:list", async () => listPayments.execute());
  ipcMain.handle("payments:get-by-tenant", async (_, tenantId: string) => listPayments.execute(tenantId));
}
