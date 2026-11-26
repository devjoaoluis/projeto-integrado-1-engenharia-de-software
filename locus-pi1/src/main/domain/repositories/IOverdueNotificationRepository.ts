import { OverdueNotification } from "../entities/OverdueRent";

export interface OverdueNotificationFilter {
  rentalId?: string;
  tenantId?: string;
  referenceMonth?: string;
  since?: number;
}

export interface IOverdueNotificationRepository {
  create(notification: OverdueNotification): Promise<OverdueNotification>;
  findByRentalAndMonth(rentalId: string, referenceMonth: string): Promise<OverdueNotification[]>;
  findLatestForRentalMonth(rentalId: string, referenceMonth: string): Promise<OverdueNotification | null>;
  list(filter?: OverdueNotificationFilter): Promise<OverdueNotification[]>;
}

