import { Property } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export class ListProperties {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(): Promise<Property[]> {
    return this.propertyRepository.findAll();
  }
}
