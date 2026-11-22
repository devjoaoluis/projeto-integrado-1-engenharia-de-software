import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IContactRepository } from "../../domain/repositories/IContactRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";
import { FillContractTemplate } from "./FillContractTemplate";
import { DEFAULT_RENTAL_CONTRACT_TEMPLATE } from "./defaultContractTemplate";
import { Property } from "../../domain/entities/Property";
import { Client } from "../../domain/entities/Client";
import { Contact } from "../../domain/entities/Contact";
import { Rental } from "../../domain/entities/Rental";

export interface AssembleContractDataInput {
  propertyId: string;
  tenantId?: string;
  templateId?: string;
  customTemplateContent?: string;
}

export interface AssembleContractDataResult {
  filledContent: string;
  templateName: string;
  property: Property;
  owner: Contact | null;
  tenant: Client | null;
  guarantor: Contact | null;
  rental: Rental | null;
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

    // Determine template content
    let templateName = "Modelo Padrão de Locação";
    let templateContent = DEFAULT_RENTAL_CONTRACT_TEMPLATE;

    if (input.customTemplateContent && input.customTemplateContent.trim().length > 0) {
      templateContent = input.customTemplateContent;
      templateName = "Modelo Personalizado";
    } else if (input.templateId && this.templateRepository) {
      const savedTemplate = await this.templateRepository.findById(input.templateId);
      if (savedTemplate) {
        templateContent = savedTemplate.content;
        templateName = savedTemplate.name;
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

    const fillResult = this.fillTemplate.execute({
      templateContent,
      property,
      owner,
      tenant: tenantData,
      guarantor,
      rental: rental
        ? {
            monthlyRent: rental.monthlyRent,
            startDate: rental.startDate,
            endDate: rental.endDate,
            dueDay: rental.dueDay,
          }
        : {
            monthlyRent: property.price,
            startDate: Date.now(),
            endDate: null,
            dueDay: 10,
          },
    });

    return {
      filledContent: fillResult.filledContent,
      templateName,
      property,
      owner,
      tenant,
      guarantor,
      rental,
    };
  }
}
