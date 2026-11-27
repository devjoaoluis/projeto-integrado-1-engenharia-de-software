import { ipcMain } from "electron";
import { NotificationService } from "../application/services/NotificationService";

export function registerNotificationsIpc(notificationService: NotificationService) {
  ipcMain.handle("notifications:list", () => notificationService.list());
  ipcMain.handle("notifications:mark-read", (_, id: string) => notificationService.markRead(id));
  ipcMain.handle("notifications:mark-all-read", () => notificationService.markAllRead());
  ipcMain.handle("notifications:delete", (_, id: string) => notificationService.delete(id));
  ipcMain.handle("notifications:clear", () => notificationService.clear());
  ipcMain.handle("notifications:open", async (_, id: string) => {
    const notification = (await notificationService.list()).find((item) => item.id === id);
    if (!notification) return null;
    await notificationService.markRead(id);
    return notification;
  });
}
