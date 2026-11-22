import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IContactRepository } from "../../domain/repositories/IContactRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { FillContractTemplate, formatDate } from "./FillContractTemplate";
import { DEFAULT_RENTAL_CONTRACT_TEMPLATE, BUILTIN_CONTRACT_TEMPLATES } from "./defaultContractTemplate";
import { Property } from "../../domain/entities/Property";
import { Client } from "../../domain/entities/Client";
import { Contact } from "../../domain/entities/Contact";
import { Rental } from "../../domain/entities/Rental";

export interface AssembleContractDataInput {
  propertyId: string;
  tenantId?: string;
  templateId?: string;
  customTemplateContent?: string;
  startDate?: number | string | null;
  endDate?: number | string | null;
  monthlyRent?: number | null;
  saveDates?: boolean;
}

export interface AssembleContractDataResult {
  filledContent: string;
  templateName: string;
  property: Property;
  owner: Contact | null;
  tenant: Client | null;
  guarantor: Contact | null;
  rental: Rental | null;
  effectiveDates: {
    startDate: number;
    endDate: number | null;
    startDateFormatted: string;
    endDateFormatted: string;
    prazoMeses: number | null;
    prazoDias: number | null;
  };
}

export function parseContractDate(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    // Formato YYYY-MM-DD
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      return Date.UTC(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10), 12, 0, 0);
    }
    // Formato DD/MM/YYYY
    const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) {
      return Date.UTC(parseInt(br[3], 10), parseInt(br[2], 10) - 1, parseInt(br[1], 10), 12, 0, 0);
    }
    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export class AssembleContractData {
  private fillTemplate = new FillContractTemplate();

  constructor(
    private propertyRepository: IPropertyRepository,
    private clientRepository: IClientRepository,
    private ownerRepository: IContactRepository,
    private guarantorRepository?: IContactRepository,
    private rentalRepository?: IRentalRepository,
    private templateRepository?: IContractTemplateRepository,
    private historyRepository?: IPropertyHistoryRepository,
  ) {}

  async execute(input: AssembleContractDataInput): Promise<AssembleContractDataResult> {
    if (!input.propertyId || !input.propertyId.trim()) {
      throw new Error("O identificador do imóvel é obrigatório.");
    }

    const property = await this.propertyRepository.findById(input.propertyId);
    if (!property) {
      throw new Error(`Imóvel com ID ${input.propertyId} não encontrado.`);
    }

    let owner: Contact | null = null;
    if (property.ownerId) {
      owner = await this.ownerRepository.findById(property.ownerId);
    }

    let rental: Rental | null = null;
    let resolvedTenantId = input.tenantId?.trim() || null;

    if (this.rentalRepository) {
      const rentals = await this.rentalRepository.findByPropertyId(property.id);
      // Pick active rental (primary rental if multiple)
      const activeRental = rentals.find((r) => !r.parentRentalId) || rentals[0];
      if (activeRental) {
        rental = activeRental;
        if (!resolvedTenantId) {
          resolvedTenantId = activeRental.tenantId;
        }
      }
    }

    let tenant: Client | null = null;
    let guarantor: Contact | null = null;

    if (resolvedTenantId) {
      tenant = await this.clientRepository.findById(resolvedTenantId);
      if (tenant?.guarantorId && this.guarantorRepository) {
        guarantor = await this.guarantorRepository.findById(tenant.guarantorId);
      }
    }

    // Resolver datas de vigência (permitindo override pelo formulário)
    let resolvedStartDate: number = rental?.startDate ?? Date.now();
    if (input.startDate !== undefined) {
      const parsedStart = parseContractDate(input.startDate);
      if (parsedStart !== null) {
        resolvedStartDate = parsedStart;
      }
    }

    let resolvedEndDate: number | null = rental?.endDate ?? null;
    if (input.endDate !== undefined) {
      resolvedEndDate = parseContractDate(input.endDate);
    }

    // Validação de consistência temporal
    if (resolvedEndDate !== null && resolvedEndDate <= resolvedStartDate) {
      throw new Error("A data de término do contrato deve ser posterior à data de início.");
    }

    // Se solicitado salvar datas e houver historyRepository
    if (input.saveDates && this.historyRepository && property.id) {
      const history = await this.historyRepository.findByPropertyId(property.id);
      const activeContract = history.contracts.find((c) =>
        (rental ? c.rentalId === rental.id : false) ||
        (resolvedTenantId ? c.tenantId === resolvedTenantId : false) ||
        c.status === "ACTIVE"
      );
      if (activeContract && typeof this.historyRepository.updateContractDates === "function") {
        await this.historyRepository.updateContractDates(activeContract.id, {
          startDate: resolvedStartDate,
          endDate: resolvedEndDate,
        });
      }
    }

    // Determine template content
    let templateName = "Modelo Padrão de Locação";
    let templateContent = DEFAULT_RENTAL_CONTRACT_TEMPLATE;

    if (input.customTemplateContent && input.customTemplateContent.trim().length > 0) {
      templateContent = input.customTemplateContent;
      templateName = "Modelo Personalizado";
    } else if (input.templateId) {
      let foundInRepo = false;
      if (this.templateRepository) {
        const savedTemplate = await this.templateRepository.findById(input.templateId);
        if (savedTemplate) {
          templateContent = savedTemplate.content;
          templateName = savedTemplate.name;
          foundInRepo = true;
        }
      }
      if (!foundInRepo) {
        const builtin = BUILTIN_CONTRACT_TEMPLATES.find(
          (t) => t.id === input.templateId || t.name.toLowerCase() === input.templateId?.toLowerCase()
        );
        if (builtin) {
          templateContent = builtin.content;
          templateName = builtin.name;
        }
      }
    }

    const tenantData: { name: string; cpfCnpj: string | null; phone: string | null; email: string | null } = tenant
      ? {
          name: tenant.name,
          cpfCnpj: tenant.cpfCnpj,
          phone: tenant.phone,
          email: tenant.email,
        }
      : {
          name: "Locatário a definir",
          cpfCnpj: null,
          phone: null,
          email: null,
        };

    const monthlyRent = input.monthlyRent ?? (rental ? rental.monthlyRent : property.price);

    const fillResult = this.fillTemplate.execute({
      templateContent,
      property,
      owner,
      tenant: tenantData,
      guarantor,
      rental: {
        monthlyRent,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        dueDay: rental ? rental.dueDay : 10,
      },
    });

    let prazoMeses: number | null = null;
    let prazoDias: number | null = null;
    if (resolvedStartDate && resolvedEndDate && resolvedEndDate > resolvedStartDate) {
      prazoDias = Math.round((resolvedEndDate - resolvedStartDate) / (1000 * 60 * 60 * 24));
      prazoMeses = Math.max(1, Math.round(prazoDias / 30));
    }

    return {
      filledContent: fillResult.filledContent,
      templateName,
      property,
      owner,
      tenant,
      guarantor,
      rental,
      effectiveDates: {
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        startDateFormatted: formatDate(resolvedStartDate),
        endDateFormatted: formatDate(resolvedEndDate),
        prazoMeses,
        prazoDias,
      },
    };
  }
}
