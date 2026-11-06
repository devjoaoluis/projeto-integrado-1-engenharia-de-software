import { VisitWithDetails } from "../../domain/entities/Visit";
import { IVisitRepository } from "../../domain/repositories/IVisitRepository";

/**
 * Caso de uso: Listar visitas futuras / próximas (RF06 - Lembretes de visitas).
 * Retorna as visitas com status AGENDADA a partir da data/hora atual em ordem cronológica.
 */
export class ListUpcomingVisits {
  constructor(private visitRepository: IVisitRepository) {}

  async execute(limit = 10, nowTimestamp = Date.now()): Promise<VisitWithDetails[]> {
    return this.visitRepository.findUpcoming(limit, nowTimestamp);
  }
}
