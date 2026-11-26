import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";

export interface TenantActiveContractSummary {
  contractId: string | null;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  rentalId: string | null;
  monthlyRent: number;
  startDate: number;
  endDate: number | null;
  startDateFormatted: string;
  endDateFormatted: string; // ex: "31/12/2026" ou "Indeterminado"
  isExpired: boolean;
  daysRemaining: number | null;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
}

/**
 * Caso de uso: Obter contrato ativo do locatário com cálculo e formatação de vigência/término.
 * Atende ao requisito de exibição clara da "Data de Término do Contrato" na ficha do locatário.
 */
export class GetTenantActiveContract {
  constructor(
    private clientRepository: IClientRepository,
    private propertyRepository: IPropertyRepository,
    private rentalRepository?: IRentalRepository,
    private historyRepository?: IPropertyHistoryRepository,
  ) {}

  async execute(tenantId: string): Promise<TenantActiveContractSummary | null> {
    const trimmedId = tenantId?.trim();
    if (!trimmedId) {
      throw new Error("O identificador do locatário (tenantId) é obrigatório.");
    }

    const tenant = await this.clientRepository.findById(trimmedId);
    if (!tenant) {
      throw new Error(`Locatário com id "${trimmedId}" não encontrado.`);
    }

    // 1. Buscar locação do locatário
    let rental = null;
    if (this.rentalRepository) {
      const allRentals = await this.rentalRepository.findAll();
      rental = allRentals.find((r) => r.tenantId === trimmedId) || null;
    }

    // 2. Buscar contrato em property_contracts
    let contract = null;
    if (rental && this.historyRepository) {
      const history = await this.historyRepository.findByPropertyId(rental.propertyId);
      contract = history.contracts.find((c) => c.rentalId === rental.id || (c.tenantId === trimmedId && c.status === "ACTIVE")) || null;
    } else if (this.historyRepository) {
      if (typeof this.historyRepository.findContractsByTenantId === "function") {
        const tenantContracts = await this.historyRepository.findContractsByTenantId(trimmedId);
        contract = tenantContracts.find((c) => c.status === "ACTIVE") || tenantContracts[0] || null;
      } else {
        const allProperties = await this.propertyRepository.findAll();
        for (const prop of allProperties) {
          const history = await this.historyRepository.findByPropertyId(prop.id);
          const match = history.contracts.find((c) => c.tenantId === trimmedId && c.status === "ACTIVE");
          if (match) {
            contract = match;
            break;
          }
        }
      }
    }

    if (!rental && !contract) {
      return null;
    }

    const propertyId = contract ? contract.propertyId : rental!.propertyId;
    const property = await this.propertyRepository.findById(propertyId);
    const propertyTitle = property?.title || "Imóvel Residencial";
    const propertyAddress = property?.address || "Endereço não informado";

    const startDate = contract ? contract.startDate : rental!.startDate;
    const endDate = contract?.endDate ?? rental?.endDate ?? null;
    const monthlyRent = contract ? contract.monthlyRent : rental!.monthlyRent;
    const status = contract ? contract.status : "ACTIVE";

    const formatDate = (ms: number | null): string => {
      if (!ms) return "Indeterminado";
      const d = new Date(ms);
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    const now = Date.now();
    let isExpired = false;
    let daysRemaining: number | null = null;

    if (endDate !== null) {
      isExpired = now > endDate;
      const diffMs = endDate - now;
      daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      contractId: contract ? contract.id : null,
      propertyId,
      propertyTitle,
      propertyAddress,
      rentalId: rental ? rental.id : contract?.rentalId ?? null,
      monthlyRent,
      startDate,
      endDate,
      startDateFormatted: formatDate(startDate),
      endDateFormatted: formatDate(endDate),
      isExpired,
      daysRemaining,
      status,
    };
  }
}
