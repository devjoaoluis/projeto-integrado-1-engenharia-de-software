import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { Rental } from "../../domain/entities/Rental";

export interface TerminateRentalDTO {
  rentalId?: string;
  tenantId?: string;
  clientId?: string;
  notes?: string | null;
  hasDebts?: boolean;
  cancelledAt?: number;
  allowPendingDebts?: boolean;
}

export interface TerminateRentalResult {
  success: boolean;
  rentalId: string;
  propertyId: string;
  tenantId: string;
  status: "ENDED" | "CANCELLED";
  endDate: number | null;
  notes?: string | null;
  hasDebts: boolean;
  propertyTitle?: string | null;
  tenantName?: string | null;
}

/**
 * Caso de uso: Quebra de Contrato e Desassociação de Locatário (HU-14).
 * Encerra o contrato ativo, desassocia o locatário, libera o imóvel (status DISPONIVEL),
 * registra a saída e estado financeiro no Histórico de Ocupação em transação atômica.
 */
export class TerminateRental {
  constructor(
    private rentalRepository: IRentalRepository,
    private inspectionRepository?: IInspectionRepository,
    private historyRepository?: IPropertyHistoryRepository,
    private clientRepository?: IClientRepository,
    private propertyRepository?: IPropertyRepository,
  ) {}

  async execute(dto: TerminateRentalDTO | string): Promise<TerminateRentalResult> {
    const input: TerminateRentalDTO = typeof dto === "string" ? { rentalId: dto } : (dto ?? {});
    const targetRentalId = input.rentalId?.trim();
    const targetTenantId = (input.tenantId || input.clientId)?.trim();

    if (!targetRentalId && !targetTenantId) {
      throw new Error("Identificador do aluguel ou do locatário é obrigatório para rescisão.");
    }

    if (!this.rentalRepository.cancel) {
      throw new Error("Rental cancellation/termination is not supported by repository");
    }

    let rental: Rental | null = null;
    if (targetRentalId) {
      rental = await this.rentalRepository.findById(targetRentalId);
    }

    if (!rental && targetTenantId) {
      const allRentals = await this.rentalRepository.findAll();
      rental = allRentals.find(
        (r) => r.tenantId === targetTenantId && (!r.endDate || r.endDate >= r.startDate)
      ) ?? null;
    }

    if (!rental) {
      throw new Error("Contrato de locação ativo não encontrado ou já encerrado para este locatário/imóvel.");
    }

    // RN03: Se as chaves foram entregues, a vistoria de saída é obrigatória para encerrar a locação
    if (this.inspectionRepository && rental.keysReleasedAt !== null) {
      let contractId: string | null = null;
      if (this.historyRepository) {
        const history = await this.historyRepository.findByPropertyId(rental.propertyId);
        const contract = history.contracts.find((c) => c.rentalId === rental.id);
        if (contract) contractId = contract.id;
      }

      const inspections = contractId
        ? await this.inspectionRepository.findByContractId(contractId)
        : await this.inspectionRepository.findByPropertyId(rental.propertyId);

      const hasExit = inspections.some(
        (i) => i.type === "EXIT" && (!contractId || i.contractId === contractId)
      );

      if (!hasExit) {
        throw new Error("RN03: A vistoria de saída é obrigatória para o encerramento da locação.");
      }
    }

    const cancelledAt = input.cancelledAt ?? Date.now();
    const status: "ENDED" | "CANCELLED" = cancelledAt > rental.startDate ? "ENDED" : "CANCELLED";
    const endDate = cancelledAt > rental.startDate ? cancelledAt : null;

    // Conforme HU-14: Débitos pendentes alertam o corretor, mas a operação pode ser concluída registrando o estado
    let finalNotes = input.notes?.trim() || "";
    const hasDebts = Boolean(input.hasDebts);
    if (hasDebts) {
      if (!finalNotes) {
        finalNotes = "Rescisão de contrato concluída com pendências financeiras registradas.";
      } else if (!finalNotes.includes("pendências") && !finalNotes.includes("débitos")) {
        finalNotes = `${finalNotes} (Rescisão com débitos pendentes registrados)`;
      }
    }

    await this.rentalRepository.cancel(rental.id, cancelledAt, {
      notes: finalNotes || null,
      hasDebts,
    });

    let tenantName: string | null = null;
    if (this.clientRepository) {
      const client = await this.clientRepository.findById(rental.tenantId);
      if (client) tenantName = client.name;
    }

    let propertyTitle: string | null = null;
    if (this.propertyRepository) {
      const prop = await this.propertyRepository.findById(rental.propertyId);
      if (prop) propertyTitle = prop.title;
    }

    return {
      success: true,
      rentalId: rental.id,
      propertyId: rental.propertyId,
      tenantId: rental.tenantId,
      status,
      endDate,
      notes: finalNotes || null,
      hasDebts,
      propertyTitle,
      tenantName,
    };
  }
}
