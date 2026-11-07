import { VisitReminderStage } from "../../domain/entities/VisitReminder";
import { IVisitReminderRepository } from "../../domain/repositories/IVisitReminderRepository";

export interface DismissVisitReminderDTO {
  visitId: string;
  stage: VisitReminderStage;
  dismissedAt?: number;
}

export class DismissVisitReminder {
  constructor(private reminderRepository: IVisitReminderRepository) {}

  async execute(dto: DismissVisitReminderDTO): Promise<{ success: boolean }> {
    if (!dto.visitId) {
      throw new Error("ID da visita é obrigatório.");
    }
    if (!dto.stage) {
      throw new Error("Estágio do lembrete é obrigatório.");
    }

    await this.reminderRepository.dismiss(
      dto.visitId,
      dto.stage,
      dto.dismissedAt ?? Date.now()
    );

    return { success: true };
  }
}
