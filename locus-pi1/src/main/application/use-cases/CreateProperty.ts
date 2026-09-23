import { randomUUID } from "crypto";
import { Property, PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export interface CreatePropertyDTO {
  title: string;
  address: string;
  description?: string;
  price: number;
}

export class CreateProperty {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(dto: CreatePropertyDTO): Promise<Property> {
    if (!dto.title || dto.title.trim() === "") {
      throw new Error("Title is required");
    }
    if (!dto.address || dto.address.trim() === "") {
      throw new Error("Address is required");
    }
    if (dto.price < 0) {
      throw new Error("Price cannot be negative");
    }

    const property: Property = {
      id: randomUUID(),
      title: dto.title,
      address: dto.address,
      description: dto.description || null,
      price: dto.price,
      status: PropertyStatus.CADASTRADO,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.propertyRepository.create(property);
  }
}
