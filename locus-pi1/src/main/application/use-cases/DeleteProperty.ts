import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { PropertyStatus } from "../../domain/entities/Property";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";
import { IFileStorage } from "../../domain/repositories/IFileStorage";
import { Rental } from "../../domain/entities/Rental";

interface IRentalPropertyLookup {
  findByPropertyId(propertyId: string): Promise<Rental[]>;
}

export class DeleteProperty {
  constructor(
    private propertyRepository: IPropertyRepository,
    private propertyMediaRepository: IPropertyMediaRepository,
    private fileStorage: IFileStorage,
    private historyRepository?: IPropertyHistoryRepository,
    private rentalRepository?: IRentalPropertyLookup
  ) {}

  async execute(id: string): Promise<void> {
    const property = await this.propertyRepository.findById(id);
    if (!property) {
      throw new Error(`Property with id ${id} not found`);
    }

    const rentals = this.rentalRepository
      ? await this.rentalRepository.findByPropertyId(id)
      : property.status === PropertyStatus.ALUGADO ? [{}] : [];
    if (rentals.length > 0) {
      throw new Error(
        "Não é possível excluir um imóvel alugado. Desassocie o locatário na visão geral do imóvel e tente novamente."
      );
    }

    if (this.historyRepository) {
      const history = await this.historyRepository.findByPropertyId(id);
      if (Object.values(history).some(records => records.length > 0)) {
        throw new Error(
          "Este imóvel possui histórico de contratos, pagamentos, vistorias ou manutenções e não pode ser excluído."
        );
      }
    }

    const medias = await this.propertyMediaRepository.findByPropertyId(id);

    // The database's foreign keys must accept deletion before any media is removed.
    // This also protects against a rental being created after the initial checks.
    await this.propertyRepository.delete(id);
    await this.propertyMediaRepository.deleteByPropertyId(id);

    // Remove files
    for (const media of medias) {
      try {
        await this.fileStorage.delete(media.filePath);
      } catch (err) {
        console.error(`Failed to delete file ${media.filePath}`, err);
        // We continue even if file deletion fails, to ensure database consistency
      }
    }

  }
}
