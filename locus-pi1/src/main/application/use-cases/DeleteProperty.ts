import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";
import { IFileStorage } from "../../domain/repositories/IFileStorage";

export class DeleteProperty {
  constructor(
    private propertyRepository: IPropertyRepository,
    private propertyMediaRepository: IPropertyMediaRepository,
    private fileStorage: IFileStorage,
    private historyRepository?: IPropertyHistoryRepository
  ) {}

  async execute(id: string): Promise<void> {
    const property = await this.propertyRepository.findById(id);
    if (!property) {
      throw new Error(`Property with id ${id} not found`);
    }

    if (property.status === PropertyStatus.ALUGADO) {
      throw new Error("A rented property cannot be deleted");
    }

    if (this.historyRepository) {
      const history = await this.historyRepository.findByPropertyId(id);
      if (Object.values(history).some(records => records.length > 0)) {
        throw new Error("A property with history cannot be deleted");
      }
    }

    const medias = await this.propertyMediaRepository.findByPropertyId(id);

    // Remove files
    for (const media of medias) {
      try {
        await this.fileStorage.delete(media.filePath);
      } catch (err) {
        console.error(`Failed to delete file ${media.filePath}`, err);
        // We continue even if file deletion fails, to ensure database consistency
      }
    }

    // Records in property_media will be removed automatically via DB cascade,
    // or we can remove them explicitly to be safe
    await this.propertyMediaRepository.deleteByPropertyId(id);

    await this.propertyRepository.delete(id);
  }
}
