import { randomUUID } from "node:crypto";
import { Visit, VisitStatus } from "../../domain/entities/Visit";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface CreateVisitDTO {
  propertyId: string;
  clientId: string;
  scheduledAt?: number;
  date?: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM"
  notes?: string | null;
  status?: VisitStatus;
}

export class CreateVisit {
  constructor(
    private visitRepository: IVisitRepository,
    private propertyRepository: IPropertyRepository,
    private clientRepository: IClientRepository
  ) {}

  async execute(dto: CreateVisitDTO): Promise<Visit> {
    if (!dto) {
      throw new Error("Dados da visita são obrigatórios.");
    }

    if (typeof dto.propertyId !== "string" || !dto.propertyId.trim()) {
      throw new Error("ID do imóvel é obrigatório.");
    }

    if (typeof dto.clientId !== "string" || !dto.clientId.trim()) {
      throw new Error("ID do cliente é obrigatório.");
    }

    // Calcula ou valida o timestamp de agendamento
    let scheduledAt = dto.scheduledAt;
    if (scheduledAt === undefined || scheduledAt === null) {
      if (!dto.date || !dto.time) {
        throw new Error("Informe a data e horário da visita.");
      }
      const parsedDate = new Date(`${dto.date}T${dto.time}:00`);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Data ou horário da visita inválidos.");
      }
      scheduledAt = parsedDate.getTime();
    }

    if (!Number.isSafeInteger(scheduledAt) || scheduledAt <= 0) {
      throw new Error("Timestamp da visita deve ser um valor numérico válido.");
    }

    // Valida se o imóvel existe
    const property = await this.propertyRepository.findById(dto.propertyId.trim());
    if (!property) {
      throw new Error(`Imóvel com id ${dto.propertyId} não encontrado.`);
    }

    // Valida se o cliente existe
    const client = await this.clientRepository.findById(dto.clientId.trim());
    if (!client) {
      throw new Error(`Cliente com id ${dto.clientId} não encontrado.`);
    }

    const now = Date.now();
    const visit: Visit = {
      id: randomUUID(),
      propertyId: dto.propertyId.trim(),
      clientId: dto.clientId.trim(),
      scheduledAt,
      status: dto.status ?? "AGENDADA",
      notes: dto.notes ? dto.notes.trim() : null,
      createdAt: now,
      updatedAt: now,
    };

    return this.visitRepository.create(visit);
  }
}
