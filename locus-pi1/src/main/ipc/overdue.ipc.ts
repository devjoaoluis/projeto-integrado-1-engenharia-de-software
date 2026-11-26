import { ipcMain } from "electron";
import { CheckOverdueRents, CheckOverdueRentsOptions } from "../application/use-cases/CheckOverdueRents";
import { TriggerOverdueAlerts, TriggerOverdueAlertsInput } from "../application/use-cases/TriggerOverdueAlerts";
import { SettleOverdueDebt, SettleOverdueDebtInput } from "../application/use-cases/SettleOverdueDebt";
import { ListOverdueNotifications } from "../application/use-cases/ListOverdueNotifications";
import { DrizzleRentalRepository } from "../infrastructure/repositories/DrizzleRentalRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleOverdueNotificationRepository } from "../infrastructure/repositories/DrizzleOverdueNotificationRepository";
import { OverdueNotificationFilter } from "../domain/repositories/IOverdueNotificationRepository";

export function registerOverdueIpc() {
  const rentalRepo = new DrizzleRentalRepository();
  const historyRepo = new DrizzlePropertyHistoryRepository();
  const clientRepo = new DrizzleClientRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const notificationRepo = new DrizzleOverdueNotificationRepository();

  const checkOverdueRents = new CheckOverdueRents(rentalRepo, historyRepo, clientRepo, propertyRepo);
  const triggerOverdueAlerts = new TriggerOverdueAlerts(checkOverdueRents, notificationRepo);
  const settleOverdueDebt = new SettleOverdueDebt(checkOverdueRents, historyRepo);
  const listOverdueNotifications = new ListOverdueNotifications(notificationRepo);

  ipcMain.handle("overdue:check", async (_, options?: CheckOverdueRentsOptions) => {
    return checkOverdueRents.execute(options);
  });

  ipcMain.handle("overdue:trigger-alerts", async (_, options?: TriggerOverdueAlertsInput) => {
    return triggerOverdueAlerts.execute(options);
  });

  ipcMain.handle("overdue:settle-debt", async (_, input: SettleOverdueDebtInput) => {
    return settleOverdueDebt.execute(input);
  });

  ipcMain.handle("overdue:list-notifications", async (_, filter?: OverdueNotificationFilter) => {
    return listOverdueNotifications.execute(filter);
  });
}

