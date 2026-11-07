import { VisitWithDetails } from "../../domain/entities/Visit";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";

export class GetVisit {
  constructor(private visitRepository: IVisitRepository) {}

  async execute(id: string): Promise<VisitWithDetails> {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("ID da visita é obrigatório.");
    }

    const visit = await this.visitRepository.findWithDetailsById(id.trim());
    if (!visit) {
      throw new Error(`Visita com id ${id} não encontrada.`);
    }

    return visit;
  }
}
