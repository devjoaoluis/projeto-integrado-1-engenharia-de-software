import { randomUUID } from "crypto";
import { Property, PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export interface CreatePropertyDTO {
  title: string;
  address: string;
  neighborhood?: string;
  bedrooms?: number;
  description?: string;
  price: number;
  iptu?: number;
  type?: string;
  fiscalStatus?: string;
  sanitationStatus?: string;
  registrationDate?: string;
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

    if (dto.bedrooms !== undefined && dto.bedrooms !== null &&
        (!Number.isSafeInteger(dto.bedrooms) || dto.bedrooms < 0)) {
      throw new Error("Bedrooms must be a non-negative integer");
    }

    const property: Property = {
      id: randomUUID(),
      title: dto.title,
      address: dto.address,
      neighborhood: dto.neighborhood || null,
      bedrooms: dto.bedrooms ?? null,
      description: dto.description || null,
      price: dto.price,
      iptu: dto.iptu ?? null,
      type: dto.type || null,
      fiscalStatus: dto.fiscalStatus || null,
      sanitationStatus: dto.sanitationStatus || null,
      registrationDate: dto.registrationDate || null,
      status: PropertyStatus.CADASTRADO,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.propertyRepository.create(property);
  }
}
