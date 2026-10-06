import { PropertyContract, PropertyHistory, PropertyPayment, PropertyInspection, PropertyMaintenance } from "../entities/PropertyHistory";

export interface IPropertyHistoryRepository {
  findByPropertyId(propertyId: string): Promise<PropertyHistory>;
  findContractById(id: string): Promise<PropertyContract | null>;
  createContract(contract: PropertyContract): Promise<PropertyContract>;
  createPayment(payment: PropertyPayment): Promise<PropertyPayment>;
  createInspection(inspection: PropertyInspection): Promise<PropertyInspection>;
  createMaintenance(maintenance: PropertyMaintenance): Promise<PropertyMaintenance>;
}
