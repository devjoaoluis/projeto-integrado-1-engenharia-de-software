import { ipcMain } from "electron";
import { DrizzleVisitRepository } from "../infrastructure/repositories/DrizzleVisitRepository";
import { DrizzleVisitReminderRepository } from "../infrastructure/repositories/DrizzleVisitReminderRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { CreateVisit, CreateVisitDTO } from "../application/use-cases/CreateVisit";
import { ListVisits } from "../application/use-cases/ListVisits";
import { GetVisit } from "../application/use-cases/GetVisit";
import { UpdateVisit, UpdateVisitDTO } from "../application/use-cases/UpdateVisit";
import { DeleteVisit } from "../application/use-cases/DeleteVisit";
import { ListUpcomingVisits } from "../application/use-cases/ListUpcomingVisits";
import { GetVisitAlertsOptions } from "../application/use-cases/GetVisitAlerts";
import { VisitReminderService } from "../application/services/VisitReminderService";
import { VisitReminderStage } from "../domain/entities/VisitReminder";
import { VisitFilter } from "../domain/repositories/IVisitRepository";

let activeReminderService: VisitReminderService | null = null;

export function registerVisitsIpc() {
  const visitRepo = new DrizzleVisitRepository();
  const reminderRepo = new DrizzleVisitReminderRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const clientRepo = new DrizzleClientRepository();

  const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
  const listVisits = new ListVisits(visitRepo);
  const getVisit = new GetVisit(visitRepo);
  const updateVisit = new UpdateVisit(visitRepo, propertyRepo, clientRepo);
  const deleteVisit = new DeleteVisit(visitRepo);
  const listUpcomingVisits = new ListUpcomingVisits(visitRepo);
  const reminderService = new VisitReminderService(visitRepo, reminderRepo);
  activeReminderService = reminderService;

  ipcMain.handle("visits:create", async (_, data: CreateVisitDTO) => {
    const result = await createVisit.execute(data);
    // Dispara checagem de lembretes ao criar nova visita
    reminderService.checkAndDispatch().catch((err) => {
      void err;
    });
    return result;
  });

  ipcMain.handle("visits:list", async (_, filter?: VisitFilter) => listVisits.execute(filter));
  ipcMain.handle("visits:get", async (_, id: string) => getVisit.execute(id));

  ipcMain.handle("visits:update", async (_, data: UpdateVisitDTO) => {
    const result = await updateVisit.execute(data);
    // Dispara checagem de lembretes após remarcação/atualização
    reminderService.checkAndDispatch().catch((err) => {
      void err;
    });
    return result;
  });

  ipcMain.handle("visits:delete", async (_, id: string) => {
    await deleteVisit.execute(id);
    return { success: true };
  });

  ipcMain.handle("visits:upcoming", async (_, limit?: number) => listUpcomingVisits.execute(limit));

  // Handlers da HU-09 (Lembretes e Alertas)
  ipcMain.handle("visits:get-alerts", async (_, options?: GetVisitAlertsOptions) => {
    return reminderService.getAlerts(options);
  });

  ipcMain.handle("visits:check-reminders", async () => {
    return reminderService.checkAndDispatch();
  });

  ipcMain.handle(
    "visits:dismiss-reminder",
    async (_, data: { visitId: string; stage: VisitReminderStage }) => {
      return reminderService.dismissReminder(data.visitId, data.stage);
    }
  );

  // Inicia o monitoramento periódico em background a cada 60 segundos
  reminderService.start(60000);

  return reminderService;
}

export function getActiveReminderService(): VisitReminderService | null {
  return activeReminderService;
}

