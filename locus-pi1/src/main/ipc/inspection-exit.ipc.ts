import { ipcMain } from "electron";
import { RecordExitInspection, RecordExitInspectionDTO } from "../application/use-cases/RecordExitInspection";
import { DrizzleInspectionRepository } from "../infrastructure/repositories/DrizzleInspectionRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { LocalFileStorage } from "../infrastructure/filesystem/LocalFileStorage";

export function registerInspectionExitIpc() {
  const recordExit = new RecordExitInspection(
    new DrizzleInspectionRepository(),
    new DrizzlePropertyRepository(),
    new DrizzlePropertyHistoryRepository(),
    new LocalFileStorage()
  );
  ipcMain.handle("inspections:record-exit", (_, data: RecordExitInspectionDTO) => recordExit.execute(data));
}
