import { OverdueNotification } from "../../domain/entities/OverdueRent";
import {
  IOverdueNotificationRepository,
  OverdueNotificationFilter,
} from "../../domain/repositories/IOverdueNotificationRepository";

export class ListOverdueNotifications {
  constructor(private notificationRepository: IOverdueNotificationRepository) {}

  async execute(filter?: OverdueNotificationFilter): Promise<OverdueNotification[]> {
    return this.notificationRepository.list(filter);
  }
}

