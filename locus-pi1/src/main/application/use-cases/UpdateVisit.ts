import {
  Visit,
  VisitReminderLeadMinutes,
  VisitStatus,
  VISIT_REMINDER_LEADS_MINUTES,
} from "../../domain/entities/Visit";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface UpdateVisitDTO {
  id: string;
  propertyId?: string;
  clientId?: string;
  scheduledAt?: number;
  date?: string;
  time?: string;
  status?: VisitStatus;
  notes?: string | null;
  reminderLeadMinutes?: VisitReminderLeadMinutes | null;
}

export class UpdateVisit {
  constructor(
    private visitRepository: IVisitRepository,
    private propertyRepository?: IPropertyRepository,
    private clientRepository?: IClientRepository
  ) {}

  async execute(dto: UpdateVisitDTO): Promise<Visit> {
    if (!dto || typeof dto.id !== "string" || !dto.id.trim()) {
      throw new Error("ID da visita é obrigatório para atualização.");
    }

    const current = await this.visitRepository.findById(dto.id.trim());
    if (!current) {
      throw new Error(`Visita com id ${dto.id} não encontrada.`);
    }

    let propertyId = current.propertyId;
    if (dto.propertyId !== undefined) {
      if (typeof dto.propertyId !== "string" || !dto.propertyId.trim()) {
        throw new Error("ID do imóvel inválido.");
      }
      propertyId = dto.propertyId.trim();
      if (this.propertyRepository) {
        const property = await this.propertyRepository.findById(propertyId);
        if (!property) {
          throw new Error(`Imóvel com id ${propertyId} não encontrado.`);
        }
      }
    }

    let clientId = current.clientId;
    if (dto.clientId !== undefined) {
      if (typeof dto.clientId !== "string" || !dto.clientId.trim()) {
        throw new Error("ID do cliente inválido.");
      }
      clientId = dto.clientId.trim();
      if (this.clientRepository) {
        const client = await this.clientRepository.findById(clientId);
        if (!client) {
          throw new Error(`Cliente com id ${clientId} não encontrado.`);
        }
      }
    }

    let scheduledAt = current.scheduledAt;
    if (dto.scheduledAt !== undefined && dto.scheduledAt !== null) {
      if (!Number.isSafeInteger(dto.scheduledAt) || dto.scheduledAt <= 0) {
        throw new Error("Timestamp da visita deve ser um valor numérico válido.");
      }
      scheduledAt = dto.scheduledAt;
    } else if (dto.date && dto.time) {
      const parsedDate = new Date(`${dto.date}T${dto.time}:00`);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Data ou horário da visita inválidos.");
      }
      scheduledAt = parsedDate.getTime();
    }

    let status = current.status;
    if (dto.status !== undefined) {
      if (!["AGENDADA", "REALIZADA", "CANCELADA"].includes(dto.status)) {
        throw new Error("Status inválido. Use AGENDADA, REALIZADA ou CANCELADA.");
      }
      status = dto.status;
    }

    let reminderLeadMinutes = current.reminderLeadMinutes;
    if (dto.reminderLeadMinutes !== undefined) {
      if (
        dto.reminderLeadMinutes !== null &&
        !(VISIT_REMINDER_LEADS_MINUTES as readonly number[]).includes(dto.reminderLeadMinutes)
      ) {
        throw new Error("Antecedência de notificação inválida.");
      }
      reminderLeadMinutes = dto.reminderLeadMinutes;
    }

    const scheduledAtChanged = scheduledAt !== current.scheduledAt;

    if (status === "AGENDADA") {
      if (scheduledAtChanged && scheduledAt < Date.now()) {
        throw new Error("Não é permitido agendar visitas em datas ou horários anteriores ao momento atual.");
      }

      const existingVisits = await this.visitRepository.findAll({
        status: "AGENDADA",
        fromTimestamp: scheduledAt,
        toTimestamp: scheduledAt,
      });
      const conflict = existingVisits.find(
        (visit) => visit.id !== current.id && visit.scheduledAt === scheduledAt
      );
      if (conflict) {
        const conflictTime = new Date(conflict.scheduledAt).toLocaleString("pt-BR");
        throw new Error(
          `Horário ocupado: ${conflict.clientName} já tem uma visita para "${conflict.propertyTitle}" em ${conflictTime}.`
        );
      }
    }

    let notes = current.notes;
    if (dto.notes !== undefined) {
      notes = dto.notes ? dto.notes.trim() : null;
    }

    const notificationSettingsChanged =
      scheduledAtChanged ||
      reminderLeadMinutes !== current.reminderLeadMinutes ||
      (current.status !== "AGENDADA" && status === "AGENDADA");

    const updatedVisit: Visit = {
      ...current,
      propertyId,
      clientId,
      scheduledAt,
      reminderLeadMinutes,
      notificationSent: notificationSettingsChanged ? false : current.notificationSent,
      status,
      notes,
      updatedAt: Date.now(),
    };

    return this.visitRepository.update(updatedVisit);
  }
}
