import { PropertyOverview } from "../../domain/entities/PropertyHistory";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export class GetPropertyOverview {
  constructor(
    private propertyRepository: IPropertyRepository,
    private mediaRepository: IPropertyMediaRepository,
    private historyRepository: IPropertyHistoryRepository,
    private rentalRepository?: IRentalRepository,
  ) {}

  async execute(propertyId: string): Promise<PropertyOverview> {
    if (typeof propertyId !== "string" || !propertyId.trim()) throw new Error("Property id is required");
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) throw new Error(`Property with id ${propertyId} not found`);
    const media = await this.mediaRepository.findByPropertyId(propertyId);
    const history = await this.historyRepository.findByPropertyId(propertyId);
    const now = Date.now();
    const contracts: PropertyOverview["contracts"] = { current: [], previous: [], scheduled: [] };
    for (const contract of history.contracts) {
      if (contract.status !== "ACTIVE" || (contract.endDate !== null && contract.endDate <= now)) {
        contracts.previous.push(contract);
      } else if (contract.startDate > now) {
        contracts.scheduled.push(contract);
      } else {
        contracts.current.push(contract);
      }
    }
    if (this.rentalRepository) {
      const rentals = await this.rentalRepository.findByPropertyId(propertyId);
      for (const rental of rentals) {
        if (!history.contracts.some((contract) => contract.rentalId === rental.id)) {
          (rental.startDate > now ? contracts.scheduled : contracts.current).push({
            id: rental.id,
            propertyId: rental.propertyId,
            tenantId: rental.tenantId,
            rentalId: rental.id,
            reference: rental.id,
            monthlyRent: rental.monthlyRent,
            startDate: rental.startDate,
            endDate: null,
            status: "ACTIVE",
            createdAt: rental.createdAt,
          });
        }
      }
    }
    return { property, media, contracts, payments: history.payments,
      inspections: history.inspections, maintenances: history.maintenances };
  }
}
