import { VisitReminder, VisitReminderStage } from "../entities/VisitReminder";

export interface IVisitReminderRepository {
  recordTriggered(reminder: VisitReminder): Promise<VisitReminder>;
  isTriggered(visitId: string, stage: VisitReminderStage): Promise<boolean>;
  dismiss(visitId: string, stage: VisitReminderStage, dismissedAt?: number): Promise<void>;
  findByVisitId(visitId: string): Promise<VisitReminder[]>;
  findAll(): Promise<VisitReminder[]>;
}
