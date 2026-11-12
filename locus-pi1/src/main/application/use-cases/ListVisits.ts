import { VisitWithDetails } from "../../domain/entities/Visit";
import { IVisitRepository, VisitFilter } from "../../domain/repositories/IVisitRepository";

export class ListVisits {
  constructor(private visitRepository: IVisitRepository) {}

  async execute(filter?: VisitFilter): Promise<VisitWithDetails[]> {
    return this.visitRepository.findAll(filter);
  }
}
