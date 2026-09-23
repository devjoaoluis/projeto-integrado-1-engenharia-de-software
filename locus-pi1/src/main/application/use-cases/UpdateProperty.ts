import { Property, PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export interface UpdatePropertyDTO {
  id: string;
  title?: string;
  address?: string;
  description?: string;
  price?: number;
  status?: PropertyStatus;
}

export class UpdateProperty {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(dto: UpdatePropertyDTO): Promise<Property> {
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
    if (dto.price !== undefined) {
      if (dto.price < 0) throw new Error("Price cannot be negative");
      property.price = dto.price;
    }
    if (dto.description !== undefined) {
      property.description = dto.description;
    }
    if (dto.status !== undefined) {
      property.status = dto.status;
    }

    property.updatedAt = Date.now();

    return this.propertyRepository.update(property);
  }
}
