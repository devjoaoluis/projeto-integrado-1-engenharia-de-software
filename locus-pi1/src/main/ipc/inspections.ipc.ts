import { ipcMain } from "electron";
import { GetInspection } from "../application/use-cases/GetInspection";
import { ListInspections, ListInspectionsDTO } from "../application/use-cases/ListInspections";
import { DrizzleInspectionRepository } from "../infrastructure/repositories/DrizzleInspectionRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";

export function registerInspectionsIpc() {
  const inspections = new DrizzleInspectionRepository();
  const properties = new DrizzlePropertyRepository();
  const history = new DrizzlePropertyHistoryRepository();
  const get = new GetInspection(inspections);
  const list = new ListInspections(inspections, properties, history);
  ipcMain.handle("inspections:get", (_, id: string) => get.execute(id));
  ipcMain.handle("inspections:list", (_, data: ListInspectionsDTO) => list.execute(data));
}
