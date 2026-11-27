import { describe, it } from "node:test";
import assert from "node:assert";
import { GetOwnerPayoutReport } from "../GetOwnerPayoutReport";
import { GenerateOwnerPayoutPdf } from "../GenerateOwnerPayoutPdf";
import { Contact } from "../../../domain/entities/Contact";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import {
  PropertyContract,
  PropertyHistory,
  PropertyPayment,
  PropertyInspection,
  PropertyMaintenance,
} from "../../../domain/entities/PropertyHistory";
import { Client } from "../../../domain/entities/Client";
import { IOwnerRepository } from "../../../domain/repositories/IOwnerRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IPropertyHistoryRepository } from "../../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";

class MockOwnerRepository implements IOwnerRepository {
  owners: Contact[] = [];

  async create(contact: Contact): Promise<Contact> {
    this.owners.push(contact);
    return contact;
  }
  async findById(id: string): Promise<Contact | null> {
    return this.owners.find((o) => o.id === id) ?? null;
  }
  async findByCpfCnpj(cpfCnpj: string): Promise<Contact | null> {
    return this.owners.find((o) => o.cpfCnpj === cpfCnpj) ?? null;
  }
  async findAll(): Promise<Contact[]> {
    return this.owners;
  }
  async update(contact: Contact): Promise<Contact> {
    const idx = this.owners.findIndex((o) => o.id === contact.id);
    if (idx >= 0) this.owners[idx] = contact;
    return contact;
  }
  async delete(id: string): Promise<void> {
    this.owners = this.owners.filter((o) => o.id !== id);
  }
}

class MockPropertyRepository implements IPropertyRepository {
  properties: Property[] = [];

  async create(property: Property): Promise<Property> {
    this.properties.push(property);
    return property;
  }
  async findById(id: string): Promise<Property | null> {
    return this.properties.find((p) => p.id === id) ?? null;
  }
  async findAll(): Promise<Property[]> {
    return this.properties;
  }
  async search(): Promise<any> {
    return { properties: this.properties, total: this.properties.length, page: 1, limit: 10, totalPages: 1 };
  }
  async update(property: Property): Promise<Property> {
    const idx = this.properties.findIndex((p) => p.id === property.id);
    if (idx >= 0) this.properties[idx] = property;
    return property;
  }
  async delete(id: string): Promise<void> {
    this.properties = this.properties.filter((p) => p.id !== id);
  }
}

class MockHistoryRepository implements IPropertyHistoryRepository {
  contracts: PropertyContract[] = [];
  payments: PropertyPayment[] = [];
  inspections: PropertyInspection[] = [];
  maintenances: PropertyMaintenance[] = [];

  async findByPropertyId(propertyId: string): Promise<PropertyHistory> {
    return {
      contracts: this.contracts.filter((c) => c.propertyId === propertyId),
      payments: this.payments.filter((p) => p.propertyId === propertyId),
      inspections: this.inspections.filter((i) => i.propertyId === propertyId),
      maintenances: this.maintenances.filter((m) => m.propertyId === propertyId),
    };
  }
  async findAllContracts(): Promise<PropertyContract[]> { return this.contracts; }
  async findContractById(id: string): Promise<PropertyContract | null> {
    return this.contracts.find((c) => c.id === id) ?? null;
  }
  async createContract(contract: PropertyContract): Promise<PropertyContract> {
    this.contracts.push(contract);
    return contract;
  }
  async createPayment(payment: PropertyPayment): Promise<PropertyPayment> {
    this.payments.push(payment);
    return payment;
  }
  async createInspection(inspection: PropertyInspection): Promise<PropertyInspection> {
    this.inspections.push(inspection);
    return inspection;
  }
  async createMaintenance(maintenance: PropertyMaintenance): Promise<PropertyMaintenance> {
    this.maintenances.push(maintenance);
    return maintenance;
  }
}

class MockClientRepository implements IClientRepository {
  clients: Client[] = [];

  async create(client: Client): Promise<Client> {
    this.clients.push(client);
    return client;
  }
  async findById(id: string): Promise<Client | null> {
    return this.clients.find((c) => c.id === id) ?? null;
  }
  async findByCpfCnpj(cpfCnpj: string): Promise<Client | null> {
    return this.clients.find((c) => c.cpfCnpj === cpfCnpj) ?? null;
  }
  async findAll(): Promise<Client[]> {
    return this.clients;
  }
  async update(client: Client): Promise<Client> {
    const idx = this.clients.findIndex((c) => c.id === client.id);
    if (idx >= 0) this.clients[idx] = client;
    return client;
  }
  async delete(id: string): Promise<void> {
    this.clients = this.clients.filter((c) => c.id !== id);
  }
}

describe("HU-16: Relatório Mensal de Repasse ao Proprietário (RF18)", () => {
  const setup = () => {
    const ownerRepo = new MockOwnerRepository();
    const propertyRepo = new MockPropertyRepository();
    const historyRepo = new MockHistoryRepository();
    const clientRepo = new MockClientRepository();

    const getOwnerPayoutReport = new GetOwnerPayoutReport(
      ownerRepo,
      propertyRepo,
      historyRepo,
      clientRepo
    );
    const generatePdf = new GenerateOwnerPayoutPdf();

    // Proprietário 1 (Alvo)
    const owner1: Contact = {
      id: "owner-100",
      name: "Dona Maria da Silva",
      cpfCnpj: "123.456.789-00",
      phone: "(11) 98888-7777",
      email: "maria.silva@email.com",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    ownerRepo.owners.push(owner1);

    // Proprietário 2 (Outro proprietário para testar isolamento)
    const owner2: Contact = {
      id: "owner-200",
      name: "Seu José Oliveira",
      cpfCnpj: "987.654.321-99",
      phone: "(11) 97777-6666",
      email: "jose.oliveira@email.com",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    ownerRepo.owners.push(owner2);

    // Imóveis do Proprietário 1
    const prop1: Property = {
      id: "prop-1",
      title: "Apartamento Jardins 101",
      address: "Rua Oscar Freire, 1000 - Apto 101",
      neighborhood: "Cerqueira César",
      bedrooms: 2,
      description: "Lindo apartamento mobiliado",
      price: 3500,
      ownerId: "owner-100",
      status: PropertyStatus.ALUGADO,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const prop2: Property = {
      id: "prop-2",
      title: "Casa Vila Madalena",
      address: "Rua Girassol, 250",
      neighborhood: "Vila Madalena",
      bedrooms: 3,
      description: "Casa ampla com jardim",
      price: 5200,
      ownerId: "owner-100",
      status: PropertyStatus.ALUGADO,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    // Imóvel do Proprietário 2
    const prop3: Property = {
      id: "prop-3",
      title: "Studio Pinheiros",
      address: "Rua Fradique Coutinho, 50",
      neighborhood: "Pinheiros",
      bedrooms: 1,
      description: "Studio moderno",
      price: 2800,
      ownerId: "owner-200",
      status: PropertyStatus.ALUGADO,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    propertyRepo.properties.push(prop1, prop2, prop3);

    // Locatários
    const tenant1: Client = {
      id: "tenant-1",
      name: "Lucas Locatário",
      cpfCnpj: "111.222.333-44",
      phone: "(11) 91111-2222",
      email: "lucas@email.com",
      type: "TENANT",
      guarantorId: null,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const tenant2: Client = {
      id: "tenant-2",
      name: "Ana Arrendatária",
      cpfCnpj: "555.666.777-88",
      phone: "(11) 93333-4444",
      email: "ana@email.com",
      type: "TENANT",
      guarantorId: null,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    clientRepo.clients.push(tenant1, tenant2);

    // Contratos
    const contract1: PropertyContract = {
      id: "contract-1",
      propertyId: "prop-1",
      tenantId: "tenant-1",
      rentalId: "rental-1",
      reference: "LOC-2026-001",
      status: "ACTIVE",
      monthlyRent: 3500,
      startDate: 1704067200000,
      endDate: 1735689600000,
      createdAt: 1704067200000,
    };
    const contract2: PropertyContract = {
      id: "contract-2",
      propertyId: "prop-2",
      tenantId: "tenant-2",
      rentalId: "rental-2",
      reference: "LOC-2026-002",
      status: "ACTIVE",
      monthlyRent: 5200,
      startDate: 1704067200000,
      endDate: 1735689600000,
      createdAt: 1704067200000,
    };
    historyRepo.contracts.push(contract1, contract2);

    return {
      ownerRepo,
      propertyRepo,
      historyRepo,
      clientRepo,
      getOwnerPayoutReport,
      generatePdf,
      owner1,
      owner2,
      prop1,
      prop2,
      prop3,
    };
  };

  it("consolida pagamentos de múltiplos imóveis de um mesmo proprietário no mês de referência com taxa padrão de 10%", async () => {
    const { historyRepo, getOwnerPayoutReport, owner1 } = setup();

    // Mês alvo: Março de 2026 (2026-03)
    const marchPaid1 = Date.UTC(2026, 2, 10, 14, 0, 0); // 10 de Março de 2026
    const marchPaid2 = Date.UTC(2026, 2, 12, 10, 0, 0); // 12 de Março de 2026

    historyRepo.payments.push(
      {
        id: "pay-1",
        propertyId: "prop-1",
        contractId: "contract-1",
        amount: 3500.0,
        paidAt: marchPaid1,
        description: "Aluguel referente a 03/2026",
        createdAt: marchPaid1,
      },
      {
        id: "pay-2",
        propertyId: "prop-2",
        contractId: "contract-2",
        amount: 5200.0,
        paidAt: marchPaid2,
        description: "Aluguel referente a 03/2026",
        createdAt: marchPaid2,
      }
    );

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "03/2026",
    });

    assert.strictEqual(report.owner.id, "owner-100");
    assert.strictEqual(report.owner.name, "Dona Maria da Silva");
    assert.strictEqual(report.referenceMonth, "03/2026");
    assert.strictEqual(report.month, 3);
    assert.strictEqual(report.year, 2026);
    assert.strictEqual(report.adminFeePercent, 10);
    assert.strictEqual(report.totalPaymentsCount, 2);
    assert.strictEqual(report.totalGrossAmount, 8700.0); // 3500 + 5200
    assert.strictEqual(report.totalAdminFeeAmount, 870.0); // 10% de 8700
    assert.strictEqual(report.totalNetAmount, 7830.0); // 8700 - 870

    assert.strictEqual(report.items.length, 2);
    const item1 = report.items.find((i) => i.propertyId === "prop-1")!;
    assert.strictEqual(item1.grossAmount, 3500.0);
    assert.strictEqual(item1.adminFeeAmount, 350.0);
    assert.strictEqual(item1.netAmount, 3150.0);
    assert.strictEqual(item1.tenantName, "Lucas Locatário");

    const item2 = report.items.find((i) => i.propertyId === "prop-2")!;
    assert.strictEqual(item2.grossAmount, 5200.0);
    assert.strictEqual(item2.adminFeeAmount, 520.0);
    assert.strictEqual(item2.netAmount, 4680.0);
    assert.strictEqual(item2.tenantName, "Ana Arrendatária");
  });

  it("calcula valores com precisão em centavos sem dízimas ou erros de ponto flutuante", async () => {
    const { historyRepo, getOwnerPayoutReport, owner1 } = setup();

    // Valor com centavos que gera dízima em ponto flutuante binário puro: 1234.56 com 8.5%
    const marchPaid = Date.UTC(2026, 2, 5);
    historyRepo.payments.push({
      id: "pay-exact",
      propertyId: "prop-1",
      contractId: "contract-1",
      amount: 1234.56,
      paidAt: marchPaid,
      description: "Aluguel Março 2026",
      createdAt: marchPaid,
    });

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "2026-03",
      adminFeePercent: 8.5,
    });

    assert.strictEqual(report.totalGrossAmount, 1234.56);
    // 1234.56 * 0.085 = 104.9376 => arredonda para 104.94
    assert.strictEqual(report.totalAdminFeeAmount, 104.94);
    // 1234.56 - 104.94 = 1129.62
    assert.strictEqual(report.totalNetAmount, 1129.62);
    assert.strictEqual(report.items[0].adminFeeAmount, 104.94);
    assert.strictEqual(report.items[0].netAmount, 1129.62);
  });

  it("permite taxa de administração 0% (repasse integral ao proprietário)", async () => {
    const { historyRepo, getOwnerPayoutReport, owner1 } = setup();

    const marchPaid = Date.UTC(2026, 2, 10);
    historyRepo.payments.push({
      id: "pay-zero-fee",
      propertyId: "prop-1",
      contractId: "contract-1",
      amount: 3000.0,
      paidAt: marchPaid,
      description: "Aluguel 03/2026",
      createdAt: marchPaid,
    });

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "03/2026",
      adminFeePercent: 0,
    });

    assert.strictEqual(report.totalGrossAmount, 3000.0);
    assert.strictEqual(report.totalAdminFeeAmount, 0.0);
    assert.strictEqual(report.totalNetAmount, 3000.0);
  });

  it("isola pagamentos de outros proprietários e pagamentos de outras competências mensais", async () => {
    const { historyRepo, getOwnerPayoutReport, owner1 } = setup();

    const marchTimestamp = Date.UTC(2026, 2, 10); // Março 2026
    const februaryTimestamp = Date.UTC(2026, 1, 10); // Fevereiro 2026

    // Pagamento do imóvel do Proprietário 1 em Fevereiro (fora do mês)
    historyRepo.payments.push({
      id: "pay-feb",
      propertyId: "prop-1",
      contractId: "contract-1",
      amount: 3500.0,
      paidAt: februaryTimestamp,
      description: "Aluguel referente a 02/2026",
      createdAt: februaryTimestamp,
    });

    // Pagamento do imóvel do Proprietário 2 em Março (de outro proprietário)
    historyRepo.payments.push({
      id: "pay-prop2",
      propertyId: "prop-3",
      contractId: "contract-3",
      amount: 2800.0,
      paidAt: marchTimestamp,
      description: "Aluguel referente a 03/2026",
      createdAt: marchTimestamp,
    });

    // Pagamento do imóvel do Proprietário 1 em Março (válido)
    historyRepo.payments.push({
      id: "pay-valid",
      propertyId: "prop-1",
      contractId: "contract-1",
      amount: 3500.0,
      paidAt: marchTimestamp,
      description: "Aluguel referente a 03/2026",
      createdAt: marchTimestamp,
    });

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "03/2026",
    });

    assert.strictEqual(report.totalPaymentsCount, 1);
    assert.strictEqual(report.items[0].paymentId, "pay-valid");
    assert.strictEqual(report.totalGrossAmount, 3500.0);
  });

  it("trata mês sem nenhum pagamento recebido com lista vazia e valores zerados", async () => {
    const { getOwnerPayoutReport, owner1 } = setup();

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "05/2026",
    });

    assert.strictEqual(report.totalPaymentsCount, 0);
    assert.strictEqual(report.totalGrossAmount, 0);
    assert.strictEqual(report.totalAdminFeeAmount, 0);
    assert.strictEqual(report.totalNetAmount, 0);
    assert.deepStrictEqual(report.items, []);
  });

  it("trata proprietário sem imóveis cadastrados retornando totais zerados", async () => {
    const { ownerRepo, getOwnerPayoutReport } = setup();

    const emptyOwner: Contact = {
      id: "owner-empty",
      name: "Proprietário Sem Imóveis",
      cpfCnpj: "000.000.000-00",
      phone: null,
      email: null,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    ownerRepo.owners.push(emptyOwner);

    const report = await getOwnerPayoutReport.execute({
      ownerId: "owner-empty",
      referenceMonth: "03/2026",
    });

    assert.strictEqual(report.totalPropertiesCount, 0);
    assert.strictEqual(report.totalPaymentsCount, 0);
    assert.strictEqual(report.totalNetAmount, 0);
  });

  it("rejeita semanticamente quando o proprietário não existe", async () => {
    const { getOwnerPayoutReport } = setup();

    await assert.rejects(
      async () => {
        await getOwnerPayoutReport.execute({
          ownerId: "non-existent-owner",
          referenceMonth: "03/2026",
        });
      },
      {
        message: 'Proprietário com id "non-existent-owner" não encontrado.',
      }
    );
  });

  it("rejeita parâmetros inválidos de mês ou taxa de administração", async () => {
    const { getOwnerPayoutReport, owner1 } = setup();

    // Taxa negativa
    await assert.rejects(
      async () => {
        await getOwnerPayoutReport.execute({
          ownerId: owner1.id,
          referenceMonth: "03/2026",
          adminFeePercent: -5,
        });
      },
      {
        message: "A taxa de administração deve ser um número válido entre 0% e 100%.",
      }
    );

    // Taxa > 100
    await assert.rejects(
      async () => {
        await getOwnerPayoutReport.execute({
          ownerId: owner1.id,
          referenceMonth: "03/2026",
          adminFeePercent: 150,
        });
      },
      {
        message: "A taxa de administração deve ser um número válido entre 0% e 100%.",
      }
    );

    // Mês inválido (> 12)
    await assert.rejects(
      async () => {
        await getOwnerPayoutReport.execute({
          ownerId: owner1.id,
          month: 13,
          year: 2026,
        });
      },
      {
        message: "Mês de referência inválido: 13. O mês deve estar entre 1 e 12.",
      }
    );
  });

  it("gera PDF válido contendo cabeçalho '%PDF-' para o relatório de repasse", async () => {
    const { historyRepo, getOwnerPayoutReport, generatePdf, owner1 } = setup();

    const marchTimestamp = Date.UTC(2026, 2, 10);
    historyRepo.payments.push({
      id: "pay-pdf-1",
      propertyId: "prop-1",
      contractId: "contract-1",
      amount: 4500.0,
      paidAt: marchTimestamp,
      description: "Aluguel referente a 03/2026",
      createdAt: marchTimestamp,
    });

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "03/2026",
    });

    const pdfBytes = await generatePdf.execute(report);

    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 500);

    // Validar assinatura mágica do arquivo PDF "%PDF-"
    const magicHeader = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
    assert.strictEqual(magicHeader, "%PDF-");
  });

  it("gera PDF válido mesmo quando não há pagamentos no período (relatório zerado)", async () => {
    const { getOwnerPayoutReport, generatePdf, owner1 } = setup();

    const report = await getOwnerPayoutReport.execute({
      ownerId: owner1.id,
      referenceMonth: "03/2026",
    });

    const pdfBytes = await generatePdf.execute(report);
    assert.ok(pdfBytes instanceof Uint8Array);
    const magicHeader = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
    assert.strictEqual(magicHeader, "%PDF-");
  });
});
