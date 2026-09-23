import { Property } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export class GetProperty {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(id: string): Promise<Property> {
    const property = await this.propertyRepository.findById(id);
    if (!property) {
      throw new Error(`Property with id ${id} not found`);
    }
    return property;
  }
}
