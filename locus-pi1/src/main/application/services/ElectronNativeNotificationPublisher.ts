import { Notification } from "electron";
import { AppNotification } from "../../domain/entities/AppNotification";
import { INativeNotificationPublisher } from "./NotificationService";

export class ElectronNativeNotificationPublisher implements INativeNotificationPublisher {
  show(
    notification: AppNotification,
    onClick: () => void,
    onFailure: (reason: string) => void
  ): boolean {
    if (!Notification.isSupported()) return false;

    try {
      const nativeNotification = new Notification({
        title: notification.title,
        body: notification.message,
      });
      nativeNotification.once("click", onClick);
      nativeNotification.once("failed", (_event, error) => {
        console.error("Falha ao mostrar uma notificação do Windows:", error);
        onFailure(error);
      });
      nativeNotification.show();
      return true;
    } catch (error) {
      console.error("O Windows não conseguiu exibir a notificação:", error);
      return false;
    }
  }
}
