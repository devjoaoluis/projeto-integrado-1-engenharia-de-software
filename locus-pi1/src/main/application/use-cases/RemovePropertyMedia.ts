import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";
import { IFileStorage } from "../../domain/repositories/IFileStorage";

export class RemovePropertyMedia {
  constructor(
    private propertyMediaRepository: IPropertyMediaRepository,
    private fileStorage: IFileStorage
  ) {}

  async execute(id: string): Promise<void> {
    const media = await this.propertyMediaRepository.findById(id);
    if (!media) {
      throw new Error(`Media with id ${id} not found`);
    }

    try {
      await this.fileStorage.delete(media.filePath);
    } catch (error) {
      console.error(`Failed to delete file ${media.filePath}, deleting from database anyway`, error);
    }

    await this.propertyMediaRepository.delete(id);
  }
}
