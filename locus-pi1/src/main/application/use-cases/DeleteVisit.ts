import { IVisitRepository } from "../../domain/repositories/IVisitRepository";

export class DeleteVisit {
  constructor(private visitRepository: IVisitRepository) {}

  async execute(id: string): Promise<void> {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("ID da visita é obrigatório.");
    }

    const visit = await this.visitRepository.findById(id.trim());
    if (!visit) {
      throw new Error(`Visita com id ${id} não encontrada.`);
    }

    await this.visitRepository.delete(id.trim());
  }
}
