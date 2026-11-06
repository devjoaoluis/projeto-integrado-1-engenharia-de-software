import { ipcMain } from "electron";
import { DrizzleVisitRepository } from "../infrastructure/repositories/DrizzleVisitRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { CreateVisit, CreateVisitDTO } from "../application/use-cases/CreateVisit";
import { ListVisits } from "../application/use-cases/ListVisits";
import { GetVisit } from "../application/use-cases/GetVisit";
import { UpdateVisit, UpdateVisitDTO } from "../application/use-cases/UpdateVisit";
import { DeleteVisit } from "../application/use-cases/DeleteVisit";
import { ListUpcomingVisits } from "../application/use-cases/ListUpcomingVisits";
import { VisitFilter } from "../domain/repositories/IVisitRepository";

export function registerVisitsIpc() {
  const visitRepo = new DrizzleVisitRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const clientRepo = new DrizzleClientRepository();

  const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
  const listVisits = new ListVisits(visitRepo);
  const getVisit = new GetVisit(visitRepo);
  const updateVisit = new UpdateVisit(visitRepo, propertyRepo, clientRepo);
  const deleteVisit = new DeleteVisit(visitRepo);
  const listUpcomingVisits = new ListUpcomingVisits(visitRepo);

  ipcMain.handle("visits:create", async (_, data: CreateVisitDTO) => createVisit.execute(data));
  ipcMain.handle("visits:list", async (_, filter?: VisitFilter) => listVisits.execute(filter));
  ipcMain.handle("visits:get", async (_, id: string) => getVisit.execute(id));
  ipcMain.handle("visits:update", async (_, data: UpdateVisitDTO) => updateVisit.execute(data));
  ipcMain.handle("visits:delete", async (_, id: string) => {
    await deleteVisit.execute(id);
    return { success: true };
  });
  ipcMain.handle("visits:upcoming", async (_, limit?: number) => listUpcomingVisits.execute(limit));
}
