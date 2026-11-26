import { randomUUID } from "crypto";
import { PropertyContract, PropertyPayment, PropertyInspection, PropertyMaintenance } from "../../domain/entities/PropertyHistory";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

type HistoryInput<T> = Omit<T, "id" | "createdAt">;
export type RecordPropertyHistoryDTO =
  | { type: "CONTRACT"; data: HistoryInput<PropertyContract> }
  | { type: "PAYMENT"; data: HistoryInput<PropertyPayment> }
  | { type: "INSPECTION"; data: HistoryInput<PropertyInspection> }
  | { type: "MAINTENANCE"; data: HistoryInput<PropertyMaintenance> };

export class RecordPropertyHistory {
  constructor(
    private historyRepository: IPropertyHistoryRepository,
    private propertyRepository: IPropertyRepository,
    private clientRepository: IClientRepository,
    private rentalRepository: IRentalRepository,
  ) {}

  async execute(dto: RecordPropertyHistoryDTO) {
    if (!dto || !["CONTRACT", "PAYMENT", "INSPECTION", "MAINTENANCE"].includes(dto.type) || !dto.data) {
      throw new Error("A valid history type and data are required");
    }
    this.requireText(dto.data.propertyId, "Property id");
    if (!await this.propertyRepository.findById(dto.data.propertyId)) {
      throw new Error(`Property with id ${dto.data.propertyId} not found`);
    }
    const id = randomUUID();
    const createdAt = Date.now();
    // Explicit field mapping prevents IPC callers from overriding identifiers or timestamps.
    switch (dto.type) {
      case "CONTRACT": {
        const data = dto.data;
        this.requireText(data.tenantId, "Tenant id");
        this.requireText(data.reference, "Contract reference");
        this.requireAmount(data.monthlyRent, "Monthly rent", false);
        this.requireDate(data.startDate, "Start date");
        if (data.endDate !== null) {
          this.requireDate(data.endDate, "End date");
          if (data.endDate <= data.startDate) throw new Error("End date must be after start date");
        }
        if (!["ACTIVE", "ENDED", "CANCELLED"].includes(data.status)) throw new Error("Invalid contract status");
        if (data.status === "ENDED" && (data.endDate === null || data.endDate > createdAt)) {
          throw new Error("An ended contract requires a past end date");
        }
        if (!await this.clientRepository.findById(data.tenantId)) throw new Error("Tenant not found");
        if (data.rentalId !== null) {
          this.requireText(data.rentalId, "Rental id");
          const rental = await this.rentalRepository.findById(data.rentalId);
          if (!rental || rental.propertyId !== data.propertyId || rental.tenantId !== data.tenantId) {
            throw new Error("Rental must belong to the same property and tenant");
          }
        }
        return this.historyRepository.createContract({ id, createdAt, propertyId: data.propertyId,
          tenantId: data.tenantId, rentalId: data.rentalId, reference: data.reference.trim(),
          monthlyRent: data.monthlyRent, startDate: data.startDate, endDate: data.endDate, status: data.status });
      }
      case "PAYMENT": {
        const data = dto.data;
        this.requireText(data.contractId, "Contract id");
        this.requireText(data.description, "Description");
        this.requireAmount(data.amount, "Amount", false);
        this.requireDate(data.paidAt, "Payment date");
        if (data.paidAt > createdAt) throw new Error("Payment date cannot be in the future");
        const contract = await this.historyRepository.findContractById(data.contractId);
        if (!contract || contract.propertyId !== data.propertyId) throw new Error("Contract must belong to the property");
        return this.historyRepository.createPayment({ id, createdAt, propertyId: data.propertyId,
          contractId: data.contractId, amount: data.amount, paidAt: data.paidAt, description: data.description.trim() });
      }
      case "INSPECTION": {
        const data = dto.data;
        this.requireText(data.description, "Description");
        this.requireDate(data.inspectedAt, "Inspection date");
        if (data.inspectedAt > createdAt) throw new Error("Inspection date cannot be in the future");
        if (data.reportReference !== null) this.requireText(data.reportReference, "Report reference");
        return this.historyRepository.createInspection({ id, createdAt, propertyId: data.propertyId,
          inspectedAt: data.inspectedAt, description: data.description.trim(), reportReference: data.reportReference });
      }
      case "MAINTENANCE": {
        const data = dto.data;
        this.requireText(data.description, "Description");
        this.requireDate(data.performedAt, "Maintenance date");
        if (data.cost !== null) this.requireAmount(data.cost, "Cost", true);
        if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(data.status)) throw new Error("Invalid maintenance status");
        if (data.status === "COMPLETED" && data.performedAt > createdAt) throw new Error("Completed maintenance cannot be in the future");
        return this.historyRepository.createMaintenance({ id, createdAt, propertyId: data.propertyId,
          performedAt: data.performedAt, description: data.description.trim(), cost: data.cost, status: data.status });
      }
    }
  }

  private requireText(value: string, field: string): void {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  }

  private requireDate(value: number, field: string): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 8640000000000000) throw new Error(`${field} must be a valid timestamp`);
  }

  private requireAmount(value: number, field: string, allowZero: boolean): void {
    if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) throw new Error(`${field} must be ${allowZero ? "nonnegative" : "positive"}`);
  }
}
