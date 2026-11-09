import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FillContractTemplate } from "../FillContractTemplate";
import { AssembleContractData } from "../AssembleContractData";
import { SeedBuiltinContractTemplates } from "../SeedBuiltinContractTemplates";
import {
  BUILTIN_CONTRACT_TEMPLATES,
  DEFAULT_RENTAL_CONTRACT_TEMPLATE,
  RESIDENTIAL_GUARANTOR_CONTRACT_TEMPLATE,
  COMMERCIAL_CONTRACT_TEMPLATE,
  SEASONAL_CONTRACT_TEMPLATE,
} from "../defaultContractTemplate";
import { ContractTemplate } from "../../../domain/entities/ContractTemplate";
import { IContractTemplateRepository } from "../../../domain/repositories/IContractTemplateRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";
import { IContactRepository } from "../../../domain/repositories/IContactRepository";
import { IRentalRepository } from "../../../domain/repositories/IRentalRepository";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { Client } from "../../../domain/entities/Client";
import { Contact } from "../../../domain/entities/Contact";
import { Rental } from "../../../domain/entities/Rental";

class MockContractTemplateRepository implements IContractTemplateRepository {
  templates: ContractTemplate[] = [];

  async create(template: ContractTemplate): Promise<ContractTemplate> {
    this.templates.push(template);
    return template;
  }
  async findById(id: string): Promise<ContractTemplate | null> {
    return this.templates.find((t) => t.id === id) ?? null;
  }
  async findAll(): Promise<ContractTemplate[]> {
    return this.templates;
  }
}

class MockPropertyRepo implements Partial<IPropertyRepository> {
  props: Property[] = [];
  async findById(id: string): Promise<Property | null> {
    return this.props.find((p) => p.id === id) ?? null;
  }
}

class MockClientRepo implements Partial<IClientRepository> {
  clients: Client[] = [];
  async findById(id: string): Promise<Client | null> {
    return this.clients.find((c) => c.id === id) ?? null;
  }
}

class MockContactRepo implements Partial<IContactRepository> {
  contacts: Contact[] = [];
  async findById(id: string): Promise<Contact | null> {
    return this.contacts.find((c) => c.id === id) ?? null;
  }
}

class MockRentalRepo implements Partial<IRentalRepository> {
  rentals: Rental[] = [];
  async findByPropertyId(propertyId: string): Promise<Rental[]> {
    return this.rentals.filter((r) => r.propertyId === propertyId);
  }
}

describe("HU-17: Expansão de Modelos de Contrato (Comercial, Residencial com Fiador, Temporada)", () => {
  const fillTemplate = new FillContractTemplate();

  const mockProperty = {
    title: "Conjunto Comercial 501",
    address: "Av. Paulista, 1000, Sala 501",
    neighborhood: "Bela Vista",
    type: "Comercial",
    bedrooms: null as number | null,
    price: 4500,
    iptu: 350,
    description: "Excelente sala comercial com ar condicionado e recepção.",
  };

  const mockOwner = {
    name: "Empreendimentos Imobiliários Silva Ltda",
    cpfCnpj: "12.345.678/0001-99",
    phone: "1133334444",
    email: "contato@silvaimoveis.com.br",
  };

  const mockTenant = {
    name: "Tech Solutions Informática ME",
    cpfCnpj: "98.765.432/0001-11",
    phone: "11988882222",
    email: "financeiro@techsolutions.com",
  };

  const mockGuarantor = {
    name: "Roberto de Oliveira Fiador",
    cpfCnpj: "111.222.333-44",
    phone: "11977771111",
    email: "roberto.fiador@email.com",
  };

  const mockRental = {
    monthlyRent: 4500,
    startDate: new Date("2026-03-01T00:00:00Z").getTime(),
    endDate: new Date("2027-02-28T23:59:59Z").getTime(),
    dueDay: 5,
  };

  describe("Disponibilidade dos Novos Textos-Base (Modelos)", () => {
    it("disponibiliza 4 modelos nativos no catálogo de modelos integrados", () => {
      assert.equal(BUILTIN_CONTRACT_TEMPLATES.length, 4);

      const categories = BUILTIN_CONTRACT_TEMPLATES.map((t) => t.category);
      assert.ok(categories.includes("RESIDENCIAL"));
      assert.ok(categories.includes("RESIDENCIAL_FIADOR"));
      assert.ok(categories.includes("COMERCIAL"));
      assert.ok(categories.includes("TEMPORADA"));
    });

    it("possui textos-base válidos e não vazios para cada modelo", () => {
      assert.ok(DEFAULT_RENTAL_CONTRACT_TEMPLATE.length > 500);
      assert.ok(RESIDENTIAL_GUARANTOR_CONTRACT_TEMPLATE.length > 500);
      assert.ok(COMMERCIAL_CONTRACT_TEMPLATE.length > 500);
      assert.ok(SEASONAL_CONTRACT_TEMPLATE.length > 500);
    });
  });

  describe("Preenchimento Automático de Variáveis nos Novos Modelos", () => {
    it("preenche corretamente o modelo Residencial com Fiador sem lacunas pendentes", () => {
      const result = fillTemplate.execute({
        templateContent: RESIDENTIAL_GUARANTOR_CONTRACT_TEMPLATE,
        property: {
          ...mockProperty,
          title: "Apartamento Jardins",
          address: "Rua Oscar Freire, 500",
          neighborhood: "Jardins",
          type: "Residencial",
          bedrooms: 3,
        },
        owner: mockOwner,
        tenant: mockTenant,
        guarantor: mockGuarantor,
        rental: mockRental,
        currentDate: new Date("2026-03-01T12:00:00Z"),
      });

      // Valida que dados essenciais foram substituídos
      assert.ok(result.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));
      assert.ok(result.filledContent.includes("12.345.678/0001-99"));
      assert.ok(result.filledContent.includes("Tech Solutions Informática ME"));
      assert.ok(result.filledContent.includes("Roberto de Oliveira Fiador"));
      assert.ok(result.filledContent.includes("111.222.333-44"));
      assert.ok(result.filledContent.includes("Rua Oscar Freire, 500"));
      assert.ok(result.filledContent.includes("4.500,00"));
      assert.ok(result.filledContent.includes("dia 5"));

      // Assegura que nenhuma tag {{...}} ficou sem substituição
      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });

    it("preenche corretamente o modelo Comercial sem lacunas pendentes", () => {
      const result = fillTemplate.execute({
        templateContent: COMMERCIAL_CONTRACT_TEMPLATE,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-03-01T12:00:00Z"),
      });

      assert.ok(result.filledContent.includes("CONTRATO DE LOCAÇÃO DE IMÓVEL NÃO RESIDENCIAL (COMERCIAL)"));
      assert.ok(result.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(result.filledContent.includes("Bela Vista"));
      assert.ok(result.filledContent.includes("Tech Solutions Informática ME"));
      assert.ok(result.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));
      assert.ok(result.filledContent.includes("4.500,00"));
      assert.ok(result.filledContent.includes("alvarás"));

      // Assegura que nenhuma tag {{...}} ficou sem substituição
      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });

    it("preenche corretamente o modelo de Temporada sem lacunas pendentes", () => {
      const seasonalRental = {
        monthlyRent: 3500,
        startDate: new Date("2026-12-20T00:00:00Z").getTime(),
        endDate: new Date("2027-01-20T23:59:59Z").getTime(),
        dueDay: 20,
      };

      const result = fillTemplate.execute({
        templateContent: SEASONAL_CONTRACT_TEMPLATE,
        property: {
          title: "Casa de Praia",
          address: "Av. Beira Mar, 100",
          neighborhood: "Praia Grande",
          type: "Casa",
          bedrooms: 4,
          price: 3500,
          iptu: 200,
          description: "Casa mobiliada com piscina, churrasqueira e 4 suítes.",
        },
        owner: mockOwner,
        tenant: mockTenant,
        rental: seasonalRental,
        currentDate: new Date("2026-12-15T12:00:00Z"),
      });

      assert.ok(result.filledContent.includes("CONTRATO DE LOCAÇÃO DE IMÓVEL POR TEMPORADA"));
      assert.ok(result.filledContent.includes("Av. Beira Mar, 100"));
      assert.ok(result.filledContent.includes("3.500,00"));
      assert.ok(result.filledContent.includes("Casa mobiliada com piscina"));
      assert.ok(result.filledContent.includes("90 (noventa) dias"));

      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });
  });

  describe("Integração com AssembleContractData", () => {
    it("resolve e preenche o modelo comercial usando templateId builtin-comercial", async () => {
      const propRepo = new MockPropertyRepo();
      propRepo.props.push({
        id: "prop-com-1",
        title: "Galpão Industrial",
        address: "Rodovia Anhanguera, km 100",
        neighborhood: "Distrito Industrial",
        bedrooms: 0,
        description: "Galpão com 1000m2 e doca",
        price: 12000,
        status: PropertyStatus.ALUGADO,
        ownerId: "owner-1",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const ownerRepo = new MockContactRepo();
      ownerRepo.contacts.push({
        id: "owner-1",
        name: "Logística e Transportes SA",
        cpfCnpj: "00.111.222/0001-33",
        phone: "1140028922",
        email: "diretoria@logistica.com",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const clientRepo = new MockClientRepo();
      clientRepo.clients.push({
        id: "client-com-1",
        name: "Distribuidora Nacional de Bebidas",
        cpfCnpj: "33.444.555/0001-66",
        phone: "11999998888",
        email: "operacoes@distribuidora.com",
        type: "TENANT",
        guarantorId: null,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const rentalRepo = new MockRentalRepo();
      rentalRepo.rentals.push({
        id: "rent-com-1",
        propertyId: "prop-com-1",
        tenantId: "client-com-1",
        monthlyRent: 12000,
        startDate: 1000,
        endDate: null,
        dueDay: 15,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: 1000,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const templateRepo = new MockContractTemplateRepository();

      const assemble = new AssembleContractData(
        propRepo as unknown as IPropertyRepository,
        clientRepo as unknown as IClientRepository,
        ownerRepo as unknown as IContactRepository,
        undefined,
        rentalRepo as unknown as IRentalRepository,
        templateRepo
      );

      const assembled = await assemble.execute({
        propertyId: "prop-com-1",
        templateId: "builtin-comercial",
      });

      assert.equal(assembled.templateName, "Contrato de Locação Comercial");
      assert.ok(assembled.filledContent.includes("Rodovia Anhanguera, km 100"));
      assert.ok(assembled.filledContent.includes("Distribuidora Nacional de Bebidas"));
      assert.ok(assembled.filledContent.includes("Logística e Transportes SA"));
      assert.ok(assembled.filledContent.includes("12.000,00"));
    });

    it("resolve e preenche o modelo com fiador vinculando o fiador do cliente", async () => {
      const propRepo = new MockPropertyRepo();
      propRepo.props.push({
        id: "prop-fiador-1",
        title: "Apartamento com Fiador",
        address: "Rua Augusta, 1500",
        neighborhood: "Consolação",
        bedrooms: 2,
        description: "Apartamento reformado",
        price: 3200,
        status: PropertyStatus.ALUGADO,
        ownerId: "owner-2",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const ownerRepo = new MockContactRepo();
      ownerRepo.contacts.push({
        id: "owner-2",
        name: "Ana Beatriz Proprietária",
        cpfCnpj: "222.333.444-55",
        phone: "11988880000",
        email: "ana@email.com",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const guarantorRepo = new MockContactRepo();
      guarantorRepo.contacts.push({
        id: "guarantor-1",
        name: "Marcos Paulo Fiador",
        cpfCnpj: "555.666.777-88",
        phone: "11977770000",
        email: "marcos@fiador.com",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const clientRepo = new MockClientRepo();
      clientRepo.clients.push({
        id: "client-f-1",
        name: "Lucas Inquilino",
        cpfCnpj: "333.444.555-66",
        phone: "11966660000",
        email: "lucas@email.com",
        type: "TENANT",
        guarantorId: "guarantor-1",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const rentalRepo = new MockRentalRepo();
      rentalRepo.rentals.push({
        id: "rent-f-1",
        propertyId: "prop-fiador-1",
        tenantId: "client-f-1",
        monthlyRent: 3200,
        startDate: 1000,
        endDate: null,
        dueDay: 10,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: 1000,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const templateRepo = new MockContractTemplateRepository();

      const assemble = new AssembleContractData(
        propRepo as unknown as IPropertyRepository,
        clientRepo as unknown as IClientRepository,
        ownerRepo as unknown as IContactRepository,
        guarantorRepo as unknown as IContactRepository,
        rentalRepo as unknown as IRentalRepository,
        templateRepo
      );

      const assembled = await assemble.execute({
        propertyId: "prop-fiador-1",
        templateId: "builtin-residencial-fiador",
      });

      assert.equal(assembled.templateName, "Contrato de Locação Residencial com Fiador");
      assert.ok(assembled.filledContent.includes("Marcos Paulo Fiador"));
      assert.ok(assembled.filledContent.includes("555.666.777-88"));
      assert.ok(assembled.filledContent.includes("Lucas Inquilino"));
      assert.ok(assembled.filledContent.includes("Ana Beatriz Proprietária"));
    });
  });

  describe("Caso de Uso: SeedBuiltinContractTemplates", () => {
    it("cadastra todos os 4 modelos no repositório de banco de dados e evita duplicidades", async () => {
      const templateRepo = new MockContractTemplateRepository();
      const seedUseCase = new SeedBuiltinContractTemplates(templateRepo);

      // Primeiro cadastro
      const seeded = await seedUseCase.execute();
      assert.equal(seeded.length, 4);
      assert.equal((await templateRepo.findAll()).length, 4);

      // Segundo cadastro idempotente
      const secondSeeded = await seedUseCase.execute();
      assert.equal(secondSeeded.length, 0);
      assert.equal((await templateRepo.findAll()).length, 4);
    });
  });
});
