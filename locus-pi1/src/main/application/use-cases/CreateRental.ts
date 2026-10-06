import { randomUUID } from "crypto";
import { Rental } from "../../domain/entities/Rental";
import { PropertyStatus } from "../../domain/entities/Property";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface CreateRentalDTO {
  propertyId: string;
  tenantId: string;
  monthlyRent: number;
  startDate: number;
  dueDay: number;
  parentRentalId?: string;
  // Reference to the document recording formal consent (RN02).
  formalConsent?: string;
  contractSigned?: boolean;
  signaturesNotarized?: boolean;
  initialPaymentsPaid?: boolean;
}

export class CreateRental {
  constructor(
    private rentalRepository: IRentalRepository,
    private propertyRepository: IPropertyRepository,
    private clientRepository: IClientRepository,
  ) {}

  async execute(dto: CreateRentalDTO): Promise<Rental> {
    if (!dto || typeof dto.propertyId !== "string" || !dto.propertyId.trim() ||
        typeof dto.tenantId !== "string" || !dto.tenantId.trim()) {
      throw new Error("Property and tenant are required");
    }
    if (!Number.isFinite(dto.monthlyRent) || dto.monthlyRent <= 0) {
      throw new Error("Monthly rent must be positive");
    }
    if (!Number.isSafeInteger(dto.startDate) || dto.startDate < 0 || dto.startDate > 8640000000000000) {
      throw new Error("Start date must be a valid timestamp");
    }
    if (!Number.isInteger(dto.dueDay) || dto.dueDay < 1 || dto.dueDay > 31) {
      throw new Error("Due day must be between 1 and 31");
    }
    for (const value of [dto.contractSigned, dto.signaturesNotarized, dto.initialPaymentsPaid]) {
      if (value !== undefined && typeof value !== "boolean") throw new Error("Rental prerequisites must be boolean");
    }
    if (dto.parentRentalId !== undefined && (typeof dto.parentRentalId !== "string" || !dto.parentRentalId.trim())) {
      throw new Error("Parent rental id cannot be empty");
    }
    if (dto.formalConsent !== undefined && typeof dto.formalConsent !== "string") {
      throw new Error("Formal consent must be a document reference");
    }
    const property = await this.propertyRepository.findById(dto.propertyId);
    if (!property) throw new Error(`Property with id ${dto.propertyId} not found`);
    if (!await this.clientRepository.findById(dto.tenantId)) {
      throw new Error(`Client with id ${dto.tenantId} not found`);
    }
    const parentRentalId = dto.parentRentalId ?? null;
    const formalConsent = dto.formalConsent?.trim() || null;
    if (parentRentalId) {
      if (!formalConsent) throw new Error("RN02: Formal consent is required for subletting");
      const parent = await this.rentalRepository.findById(parentRentalId);
      if (!parent || parent.propertyId !== dto.propertyId || parent.parentRentalId !== null || parent.tenantId === dto.tenantId) {
        throw new Error("Invalid parent rental for subletting");
      }
      if (property.status !== PropertyStatus.ALUGADO) throw new Error("Property is not rented");
    } else if (property.status !== PropertyStatus.CADASTRADO && property.status !== PropertyStatus.DISPONIVEL) {
      throw new Error("Property is not available for rent");
    }
    const now = Date.now();
    return this.rentalRepository.create({
      id: randomUUID(), propertyId: dto.propertyId, tenantId: dto.tenantId,
      monthlyRent: dto.monthlyRent, startDate: dto.startDate, dueDay: dto.dueDay,
      parentRentalId, formalConsent,
      contractSigned: dto.contractSigned ?? false,
      signaturesNotarized: dto.signaturesNotarized ?? false,
      initialPaymentsPaid: dto.initialPaymentsPaid ?? false,
      keysReleasedAt: null, createdAt: now, updatedAt: now,
    });
  }
}
