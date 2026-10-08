import { Property, PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export interface UpdatePropertyDTO {
  id: string;
  title?: string;
  address?: string;
  neighborhood?: string;
  bedrooms?: number;
  description?: string;
  price?: number;
  iptu?: number;
  type?: string;
  fiscalStatus?: string;
  sanitationStatus?: string;
  registrationDate?: string;
  ownerId?: string | null;
  status?: PropertyStatus;
}

export class UpdateProperty {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(dto: UpdatePropertyDTO): Promise<Property> {
    if (dto.bedrooms !== undefined && dto.bedrooms !== null &&
        (!Number.isSafeInteger(dto.bedrooms) || dto.bedrooms < 0)) {
      throw new Error("Bedrooms must be a non-negative integer");
    }

    if (dto.price !== undefined && (!Number.isFinite(dto.price) || dto.price < 0)) throw new Error("Price must be a finite non-negative number");
    if (dto.iptu !== undefined && dto.iptu !== null && (!Number.isFinite(dto.iptu) || dto.iptu < 0)) throw new Error("IPTU must be a finite non-negative number");
    const property = await this.propertyRepository.findById(dto.id);
    if (!property) {
      throw new Error(`Property with id ${dto.id} not found`);
    }

    if (dto.title !== undefined) {
      if (dto.title.trim() === "") throw new Error("Title cannot be empty");
      property.title = dto.title;
    }
    if (dto.address !== undefined) {
      if (dto.address.trim() === "") throw new Error("Address cannot be empty");
      property.address = dto.address;
    }
    if (dto.neighborhood !== undefined) {
      property.neighborhood = dto.neighborhood;
    }
    if (dto.bedrooms !== undefined) {
      property.bedrooms = dto.bedrooms;
    }
    if (dto.price !== undefined) {
      if (dto.price < 0) throw new Error("Price cannot be negative");
      property.price = dto.price;
    }
    if (dto.description !== undefined) {
      property.description = dto.description;
    }
    if (dto.iptu !== undefined) {
      if (dto.iptu < 0) throw new Error("IPTU cannot be negative");
      property.iptu = dto.iptu;
    }
    if (dto.type !== undefined) {
      property.type = dto.type || null;
    }
    if (dto.fiscalStatus !== undefined) {
      property.fiscalStatus = dto.fiscalStatus || null;
    }
    if (dto.sanitationStatus !== undefined) {
      property.sanitationStatus = dto.sanitationStatus || null;
    }
    if (dto.registrationDate !== undefined) {
      property.registrationDate = dto.registrationDate || null;
    }
    if (dto.ownerId !== undefined) {
      property.ownerId = dto.ownerId || null;
    }
    if (dto.status !== undefined) {
      property.status = dto.status;
    }

    property.updatedAt = Date.now();

    return this.propertyRepository.update(property);
  }
}
