import { AppNotification } from "../entities/AppNotification";

export interface INotificationRepository {
  createIfAbsent(
    notification: AppNotification
  ): Promise<{ created: boolean; notification: AppNotification }>;
  findById(id: string): Promise<AppNotification | null>;
  list(limit?: number): Promise<AppNotification[]>;
  markRead(id: string, readAt: number): Promise<boolean>;
  markAllRead(readAt: number): Promise<void>;
  delete(id: string, deletedAt: number): Promise<void>;
  clear(deletedAt: number): Promise<void>;
}
