import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FillContractTemplate } from "../FillContractTemplate";
import { AssembleContractData } from "../AssembleContractData";
import { SeedBuiltinContractTemplates } from "../SeedBuiltinContractTemplates";
import {
  BUILTIN_CONTRACT_TEMPLATES,
  COMMERCIAL_INSPECTION_REPORT_TEMPLATE,
  COMMERCIAL_RENTAL_CONTRACT_TEMPLATE,
  DEFAULT_RENTAL_CONTRACT_TEMPLATE,
  TENANT_OBLIGATIONS_NOTICE_TEMPLATE,
  UTILITY_POWER_OF_ATTORNEY_TEMPLATE,
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

describe("HU-17: Expansão de Modelos de Contrato (Comercial, Residencial, etc.)", () => {
  const fillTemplate = new FillContractTemplate();

  const mockProperty = {
    title: "Conjunto Comercial 501",
    address: "Av. Paulista, 1000, Sala 501",
    neighborhood: "Bela Vista",
    type: "Comercial",
    bedrooms: null as number | null,
    price: 4500,
    iptu: 350,
    description: "Excelente sala comercial com recepção.",
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
    startDate: new Date("2026-03-01T12:00:00Z").getTime(),
    endDate: new Date("2027-02-28T12:00:00Z").getTime(),
    dueDay: 5,
  };

  describe("Critério de Aceitação: Preenchimento de variáveis automáticas nos modelos", () => {
    it("preenche corretamente o modelo padrão do sistema sem lacunas pendentes", () => {
      const result = fillTemplate.execute({
        templateContent: DEFAULT_RENTAL_CONTRACT_TEMPLATE,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-03-01T12:00:00Z"),
      });

      assert.ok(result.filledContent.includes("CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL"));
      assert.ok(result.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(result.filledContent.includes("4.500,00"));
      assert.ok(result.filledContent.includes("Tech Solutions Informática ME"));
      assert.ok(result.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));

      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });

    it("preenche todas as variáveis automáticas (nome, CPF, valor, datas, endereço) em modelo de locação comercial", () => {
      const clientCommercialModel = [
        "CONTRATO DE LOCAÇÃO NÃO RESIDENCIAL / COMERCIAL",
        "Locador: {{proprietario.nome}} | Documento: {{proprietario.cpf}}",
        "Locatário: {{locatario.nome}} | Documento: {{locatario.cpf}}",
        "Imóvel locado: {{imovel.endereco}} - {{imovel.bairro}}",
        "Tipo: {{imovel.tipo}} | Descrição: {{imovel.descricao}}",
        "Valor do Aluguel: {{aluguel.valor}} com vencimento todo dia {{aluguel.vencimento}}",
        "IPTU estimado: {{imovel.iptu}}",
        "Vigência contratual: de {{aluguel.inicio}} a {{aluguel.fim}}",
        "Data de assinatura: {{data_atual}}",
      ].join("\n");

      const result = fillTemplate.execute({
        templateContent: clientCommercialModel,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-03-01T12:00:00Z"),
      });

      // Validação das variáveis solicitadas no critério de aceitação
      // Nome e CPF
      assert.ok(result.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));
      assert.ok(result.filledContent.includes("12.345.678/0001-99"));
      assert.ok(result.filledContent.includes("Tech Solutions Informática ME"));
      assert.ok(result.filledContent.includes("98.765.432/0001-11"));

      // Endereço
      assert.ok(result.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(result.filledContent.includes("Bela Vista"));

      // Valor
      assert.ok(result.filledContent.includes("4.500,00"));

      // Datas
      assert.ok(result.filledContent.includes("01/03/2026"));
      assert.ok(result.filledContent.includes("dia 5"));

      // Nenhuma lacuna pendente
      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });

    it("preenche variáveis automáticas incluindo garantia fidejussória (fiador) em modelo residencial", () => {
      const clientGuarantorModel = [
        "CONTRATO COM GARANTIA FIDEJUSSÓRIA",
        "Locador: {{locador.nome}} (CPF: {{locador.cpf}})",
        "Locatário: {{locatario.nome}} (CPF: {{locatario.cpf}})",
        "Fiador: {{fiador.nome}} (CPF: {{fiador.cpf}}, Tel: {{fiador.telefone}})",
        "Endereço: {{imovel.endereco}}, {{imovel.bairro}}",
        "Aluguel: {{aluguel.valor}} - Vencimento: dia {{aluguel.vencimento}}",
        "Período: {{aluguel.inicio}} até {{aluguel.fim}}",
        "Emitido em: {{data_atual}}",
      ].join("\n");

      const result = fillTemplate.execute({
        templateContent: clientGuarantorModel,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        guarantor: mockGuarantor,
        rental: mockRental,
        currentDate: new Date("2026-03-01T12:00:00Z"),
      });

      assert.ok(result.filledContent.includes("Roberto de Oliveira Fiador"));
      assert.ok(result.filledContent.includes("111.222.333-44"));
      assert.ok(result.filledContent.includes("Tech Solutions Informática ME"));
      assert.ok(result.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(result.filledContent.includes("4.500,00"));

      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });

    it("preenche variáveis em formato direto e invertido (nome, CPF, valor, datas, endereço)", () => {
      const customModel = [
        "Endereço: {{endereco}}",
        "Endereço imóvel: {{endereco_imovel}}",
        "Valor: {{valor}}",
        "Valor aluguel: {{valor_aluguel}}",
        "Data: {{data}}",
        "Data início: {{data_inicio}}",
        "Data fim: {{data_fim}}",
        "Nome locatário: {{nome_locatario}}",
        "CPF locatário: {{cpf_locatario}}",
        "Nome locador: {{nome_locador}}",
        "CPF locador: {{cpf_locador}}",
        "Nome fiador: {{nome_fiador}}",
        "CPF fiador: {{cpf_fiador}}",
      ].join("\n");

      const result = fillTemplate.execute({
        templateContent: customModel,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        guarantor: mockGuarantor,
        rental: mockRental,
        currentDate: new Date("2026-03-01T12:00:00Z"),
      });

      assert.ok(result.filledContent.includes("Endereço: Av. Paulista, 1000, Sala 501"));
      assert.ok(result.filledContent.includes("Endereço imóvel: Av. Paulista, 1000, Sala 501"));
      assert.ok(result.filledContent.includes("Valor: ") && result.filledContent.includes("4.500,00"));
      assert.ok(result.filledContent.includes("Valor aluguel: ") && result.filledContent.includes("4.500,00"));
      assert.ok(result.filledContent.includes("Nome locatário: Tech Solutions Informática ME"));
      assert.ok(result.filledContent.includes("CPF locatário: 98.765.432/0001-11"));
      assert.ok(result.filledContent.includes("Nome locador: Empreendimentos Imobiliários Silva Ltda"));
      assert.ok(result.filledContent.includes("CPF locador: 12.345.678/0001-99"));
      assert.ok(result.filledContent.includes("Nome fiador: Roberto de Oliveira Fiador"));
      assert.ok(result.filledContent.includes("CPF fiador: 111.222.333-44"));

      const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      assert.equal(unreplaced, null, `Tags não substituídas encontradas: ${unreplaced?.join(", ")}`);
    });
  });

  describe("Integração com AssembleContractData e Repositório de Modelos", () => {
    it("busca modelo cadastrado pelo cliente no repositório e preenche as variáveis", async () => {
      const propRepo = new MockPropertyRepo();
      propRepo.props.push({
        id: "prop-com-1",
        title: "Galpão Comercial",
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
      // Modelo providenciado/cadastrado pelo cliente no repositório
      await templateRepo.create({
        id: "template-comercial-cliente",
        name: "Contrato de Locação Comercial - Modelo Imobiliária",
        content: "CONTRATO COMERCIAL\nImóvel: {{imovel.endereco}}\nLocatário: {{locatario.nome}}\nLocador: {{proprietario.nome}}\nValor: {{aluguel.valor}}",
        createdAt: 1000,
        updatedAt: 1000,
      });

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
        templateId: "template-comercial-cliente",
      });

      assert.equal(assembled.templateName, "Contrato de Locação Comercial - Modelo Imobiliária");
      assert.ok(assembled.filledContent.includes("Rodovia Anhanguera, km 100"));
      assert.ok(assembled.filledContent.includes("Distribuidora Nacional de Bebidas"));
      assert.ok(assembled.filledContent.includes("Logística e Transportes SA"));
      assert.ok(assembled.filledContent.includes("12.000,00"));
    });

    it("resolve e preenche modelo com fiador associando o fiador registrado para o locatário", async () => {
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
      await templateRepo.create({
        id: "template-fiador-cliente",
        name: "Modelo Residencial com Fiador",
        content: "CONTRATO COM FIADOR\nFiador: {{fiador.nome}} (CPF: {{fiador.cpf}})\nLocatário: {{locatario.nome}}\nLocador: {{proprietario.nome}}",
        createdAt: 1000,
        updatedAt: 1000,
      });

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
        templateId: "template-fiador-cliente",
      });

      assert.equal(assembled.templateName, "Modelo Residencial com Fiador");
      assert.ok(assembled.filledContent.includes("Marcos Paulo Fiador"));
      assert.ok(assembled.filledContent.includes("555.666.777-88"));
      assert.ok(assembled.filledContent.includes("Lucas Inquilino"));
      assert.ok(assembled.filledContent.includes("Ana Beatriz Proprietária"));
    });
  });

  describe("Novos textos-base cadastrados (Comercial, Laudo, Procuração, Termo)", () => {
    it("preenche todas as variáveis automáticas em todos os modelos built-in sem deixar marcadores pendentes", () => {
      assert.equal(BUILTIN_CONTRACT_TEMPLATES.length, 5);

      const expectedIds = [
        "builtin-contrato-residencial",
        "builtin-contrato-comercial",
        "builtin-laudo-vistoria-comercial",
        "builtin-procuracao-enel-saae",
        "builtin-termo-obrigacoes-locatario",
      ];
      assert.deepEqual(
        BUILTIN_CONTRACT_TEMPLATES.map((t) => t.id),
        expectedIds
      );

      for (const tpl of BUILTIN_CONTRACT_TEMPLATES) {
        const result = fillTemplate.execute({
          templateContent: tpl.content,
          property: mockProperty,
          owner: mockOwner,
          tenant: mockTenant,
          rental: mockRental,
          currentDate: new Date("2026-07-28T12:00:00Z"),
        });

        const unreplaced = result.filledContent.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
        assert.equal(
          unreplaced,
          null,
          `Tags não substituídas no modelo ${tpl.id}: ${unreplaced?.join(", ")}`
        );
        assert.ok(result.filledContent.includes("Tech Solutions Informática ME"));
        assert.ok(result.filledContent.includes("98.765.432/0001-11"));
        assert.ok(result.filledContent.includes("28 de julho de 2026"));
      }
    });

    it("preenche corretamente Contrato Comercial, Laudo de Vistoria, Procuração e Termo com dados reais e preserva lacunas", () => {
      const comercial = fillTemplate.execute({
        templateContent: COMMERCIAL_RENTAL_CONTRACT_TEMPLATE,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-07-28T12:00:00Z"),
      });
      assert.ok(comercial.filledContent.includes("CONTRATO DE LOCAÇÃO PARA FINS NÃO RESIDENCIAIS"));
      assert.ok(comercial.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));
      assert.ok(comercial.filledContent.includes("12.345.678/0001-99"));
      assert.ok(comercial.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(comercial.filledContent.includes("4.500,00"));
      assert.ok(comercial.filledContent.includes("todo dia 5 de cada mês"));
      assert.ok(comercial.filledContent.includes("01/03/2026"));
      assert.ok(comercial.filledContent.includes("28/02/2027"));
      assert.ok(comercial.filledContent.includes("12 meses"));
      assert.ok(comercial.filledContent.includes("____________"));

      const laudo = fillTemplate.execute({
        templateContent: COMMERCIAL_INSPECTION_REPORT_TEMPLATE,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-07-28T12:00:00Z"),
      });
      assert.ok(laudo.filledContent.includes("LAUDO DE VISTORIA DE IMÓVEL COMERCIAL"));
      assert.ok(laudo.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(laudo.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));
      assert.ok(laudo.filledContent.includes("Tech Solutions Informática ME"));

      const procuracao = fillTemplate.execute({
        templateContent: UTILITY_POWER_OF_ATTORNEY_TEMPLATE,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-07-28T12:00:00Z"),
      });
      assert.ok(procuracao.filledContent.includes("PROCURAÇÃO"));
      assert.ok(procuracao.filledContent.includes("ENEL e SAAE"));
      assert.ok(procuracao.filledContent.includes("Av. Paulista, 1000, Sala 501"));
      assert.ok(procuracao.filledContent.includes("Tech Solutions Informática ME"));

      const termo = fillTemplate.execute({
        templateContent: TENANT_OBLIGATIONS_NOTICE_TEMPLATE,
        property: mockProperty,
        owner: mockOwner,
        tenant: mockTenant,
        rental: mockRental,
        currentDate: new Date("2026-07-28T12:00:00Z"),
      });
      assert.ok(termo.filledContent.includes("TERMO DE CIÊNCIA E OBRIGAÇÕES DO LOCATÁRIO"));
      assert.ok(termo.filledContent.includes("Lei do Inquilinato"));
      assert.ok(termo.filledContent.includes("Tech Solutions Informática ME"));
      assert.ok(termo.filledContent.includes("Empreendimentos Imobiliários Silva Ltda"));
    });

    it("semeia os modelos built-in de forma idempotente e permite montagem via AssembleContractData", async () => {
      const templateRepo = new MockContractTemplateRepository();
      const seed = new SeedBuiltinContractTemplates(templateRepo);

      const firstRun = await seed.execute();
      assert.equal(firstRun.length, 5);
      assert.equal((await templateRepo.findAll()).length, 5);

      const secondRun = await seed.execute();
      assert.equal(secondRun.length, 0);
      assert.equal((await templateRepo.findAll()).length, 5);

      const propRepo = new MockPropertyRepo();
      propRepo.props.push({
        id: "prop-com-seed",
        title: "Sala Comercial 06",
        address: "Rua Júlio Cavalcante, nº 50 - Sala 06",
        neighborhood: "Flores",
        type: "Comercial",
        bedrooms: 0,
        description: "Sala comercial nova",
        price: 1200,
        iptu: 100,
        status: PropertyStatus.ALUGADO,
        ownerId: "owner-seed",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const ownerRepo = new MockContactRepo();
      ownerRepo.contacts.push({
        id: "owner-seed",
        name: "Maria Locadora",
        cpfCnpj: "11122233344",
        phone: "88999990000",
        email: "locadora@email.com",
        createdAt: 1000,
        updatedAt: 1000,
      });

      const clientRepo = new MockClientRepo();
      clientRepo.clients.push({
        id: "tenant-seed",
        name: "Ana Locatária",
        cpfCnpj: "55566677788",
        phone: "88988881111",
        email: "ana@email.com",
        type: "TENANT",
        guarantorId: null,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const rentalRepo = new MockRentalRepo();
      rentalRepo.rentals.push({
        id: "rent-seed",
        propertyId: "prop-com-seed",
        tenantId: "tenant-seed",
        monthlyRent: 1200,
        startDate: new Date("2026-07-28T12:00:00Z").getTime(),
        endDate: new Date("2027-07-28T12:00:00Z").getTime(),
        dueDay: 28,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: 1000,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const assemble = new AssembleContractData(
        propRepo as unknown as IPropertyRepository,
        clientRepo as unknown as IClientRepository,
        ownerRepo as unknown as IContactRepository,
        undefined,
        rentalRepo as unknown as IRentalRepository,
        templateRepo
      );

      const assembled = await assemble.execute({
        propertyId: "prop-com-seed",
        templateId: "builtin-contrato-comercial",
      });

      assert.equal(assembled.templateName, "Contrato de Locação Comercial (Fins Não Residenciais)");
      assert.ok(assembled.filledContent.includes("Rua Júlio Cavalcante, nº 50 - Sala 06"));
      assert.ok(assembled.filledContent.includes("Flores"));
      assert.ok(assembled.filledContent.includes("1.200,00"));
      assert.ok(assembled.filledContent.includes("Maria Locadora"));
      assert.ok(assembled.filledContent.includes("Ana Locatária"));
      assert.ok(assembled.filledContent.includes("28/07/2026"));
      assert.ok(assembled.filledContent.includes("28/07/2027"));
    });

    it("expõe os novos modelos built-in e seed idempotente via IPC de contratos", async () => {
      const { createClient } = await import("@libsql/client");
      const { drizzle } = await import("drizzle-orm/libsql");
      const { initializeDatabase } = await import("../../../infrastructure/database/initializeDatabase");

      const sqlite = createClient({ url: "file::memory:" });
      const dbModule = require.resolve("../../../infrastructure/database/db");
      const previousDb = require.cache[dbModule];
      require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;

      const electronModule = require.resolve("electron");
      const previousElectron = require.cache[electronModule];
      const handlers = new Map<string, (event: unknown, data?: unknown) => Promise<unknown>>();
      require.cache[electronModule] = {
        exports: {
          ipcMain: {
            handle: (name: string, handler: (event: unknown, data?: unknown) => Promise<unknown>) =>
              handlers.set(name, handler),
          },
          dialog: { showSaveDialog: async () => ({ canceled: true }) },
        },
      } as NodeModule;

      try {
        await initializeDatabase(sqlite);
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate IPC and DB
        const { registerContractsIpc } = require("../../../ipc/contracts/contracts.ipc");
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate IPC and DB
        const { registerContractTemplatesIpc } = require("../../../ipc/contracts/contract-templates.ipc");
        registerContractsIpc();
        registerContractTemplatesIpc();

        const getBuiltins = handlers.get("contracts:get-builtin-templates");
        const seedBuiltins = handlers.get("contracts:seed-builtin-templates");
        const listTemplates = handlers.get("contract-templates:list");
        assert.ok(getBuiltins);
        assert.ok(seedBuiltins);
        assert.ok(listTemplates);

        const builtins = (await getBuiltins({})) as Array<{ id: string }>;
        assert.equal(builtins.length, 5);

        const seededFirst = (await seedBuiltins({})) as Array<{ id: string }>;
        assert.equal(seededFirst.length, 5);

        const seededSecond = (await seedBuiltins({})) as Array<{ id: string }>;
        assert.equal(seededSecond.length, 0);

        const listed = (await listTemplates({})) as Array<{ id: string }>;
        assert.equal(listed.length, 5);
      } finally {
        sqlite.close();
        if (previousDb) require.cache[dbModule] = previousDb;
        else delete require.cache[dbModule];
        if (previousElectron) require.cache[electronModule] = previousElectron;
        else delete require.cache[electronModule];
      }
    });
  });
});
