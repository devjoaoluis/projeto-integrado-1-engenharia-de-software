import { PropertyMedia } from "../../domain/entities/PropertyMedia";
import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export class ListPropertyMedia {
  constructor(
    private propertyMediaRepository: IPropertyMediaRepository,
    private propertyRepository: IPropertyRepository
  ) {}

  async execute(propertyId: string): Promise<PropertyMedia[]> {
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new Error(`Property with id ${propertyId} not found`);
    }

    return this.propertyMediaRepository.findByPropertyId(propertyId);
  }
}
