import { PropertyContract, PropertyHistory, PropertyPayment, PropertyInspection, PropertyMaintenance } from "../entities/PropertyHistory";

export interface IPropertyHistoryRepository {
  findByPropertyId(propertyId: string): Promise<PropertyHistory>;
  findPaymentById?(id: string): Promise<PropertyPayment | null>;
  findContractById(id: string): Promise<PropertyContract | null>;
  findAllContracts(): Promise<PropertyContract[]>;
  findContractsByTenantId?(tenantId: string): Promise<PropertyContract[]>;
  createContract(contract: PropertyContract): Promise<PropertyContract>;
  updateContractDates?(contractId: string, dates: { startDate?: number; endDate?: number | null }): Promise<PropertyContract>;
  createPayment(payment: PropertyPayment): Promise<PropertyPayment>;
  createInspection(inspection: PropertyInspection): Promise<PropertyInspection>;
  createMaintenance(maintenance: PropertyMaintenance): Promise<PropertyMaintenance>;
}
