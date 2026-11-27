export type NotificationCategory = "VISIT" | "OVERDUE" | "SYSTEM";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  target: string;
  entityId: string | null;
  data: Record<string, unknown>;
  createdAt: number;
  readAt: number | null;
  deletedAt: number | null;
}

export type NewAppNotification = Omit<AppNotification, "createdAt" | "readAt" | "deletedAt"> & {
  createdAt?: number;
};
