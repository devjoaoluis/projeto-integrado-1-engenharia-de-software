import { ipcMain } from "electron";
import { GetPropertyOverview } from "../application/use-cases/GetPropertyOverview";
import { RecordPropertyHistory, RecordPropertyHistoryDTO } from "../application/use-cases/RecordPropertyHistory";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyMediaRepository } from "../infrastructure/repositories/DrizzlePropertyMediaRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { DrizzleRentalRepository } from "../infrastructure/repositories/DrizzleRentalRepository";

export function registerPropertyOverviewIpc() {
  const historyRepo = new DrizzlePropertyHistoryRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const overview = new GetPropertyOverview(propertyRepo, new DrizzlePropertyMediaRepository(), historyRepo);
  const record = new RecordPropertyHistory(historyRepo, propertyRepo, new DrizzleClientRepository(), new DrizzleRentalRepository());

  ipcMain.handle("properties:overview", async (_, propertyId: string) => overview.execute(propertyId));
  ipcMain.handle("property-history:record", async (_, data: RecordPropertyHistoryDTO) => record.execute(data));
}
