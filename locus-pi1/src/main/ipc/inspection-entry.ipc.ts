import { ipcMain } from "electron";
import { RecordEntryInspection, RecordEntryInspectionDTO } from "../application/use-cases/RecordEntryInspection";
import { DrizzleInspectionRepository } from "../infrastructure/repositories/DrizzleInspectionRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { LocalFileStorage } from "../infrastructure/filesystem/LocalFileStorage";

export function registerInspectionEntryIpc() {
  const recordEntry = new RecordEntryInspection(new DrizzleInspectionRepository(), new DrizzlePropertyRepository(),
    new DrizzlePropertyHistoryRepository(), new LocalFileStorage());
  ipcMain.handle("inspections:record-entry", (_, data: RecordEntryInspectionDTO) => recordEntry.execute(data));
}
