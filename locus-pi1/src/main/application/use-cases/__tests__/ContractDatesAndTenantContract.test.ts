import { describe, it } from "node:test";
import assert from "node:assert";
import { AssembleContractData, parseContractDate } from "../AssembleContractData";
import { GetTenantActiveContract } from "../GetTenantActiveContract";
import { UpdateContractDates } from "../UpdateContractDates";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { Client } from "../../../domain/entities/Client";
import { Contact } from "../../../domain/entities/Contact";
import { Rental } from "../../../domain/entities/Rental";
import { PropertyContract, PropertyHistory, PropertyPayment, PropertyInspection, PropertyMaintenance } from "../../../domain/entities/PropertyHistory";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";
import { IContactRepository } from "../../../domain/repositories/IContactRepository";
import { IRentalRepository } from "../../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../../domain/repositories/IPropertyHistoryRepository";

class MockPropertyRepository implements IPropertyRepository {
  properties: Property[] = [];
  async create(p: Property) { this.properties.push(p); return p; }
  async findById(id: string) { return this.properties.find((p) => p.id === id) ?? null; }
  async findAll() { return this.properties; }
  async search(): Promise<any> { return { properties: this.properties, total: this.properties.length, page: 1, limit: 10, totalPages: 1 }; }
  async update(p: Property) { const i = this.properties.findIndex((x) => x.id === p.id); if (i >= 0) this.properties[i] = p; return p; }
  async delete(id: string) { this.properties = this.properties.filter((p) => p.id !== id); }
}

class MockClientRepository implements IClientRepository {
  clients: Client[] = [];
  async create(c: Client) { this.clients.push(c); return c; }
  async findById(id: string) { return this.clients.find((c) => c.id === id) ?? null; }
  async findByCpfCnpj(cpfCnpj: string) { return this.clients.find((c) => c.cpfCnpj === cpfCnpj) ?? null; }
  async findAll() { return this.clients; }
  async update(c: Client) { const i = this.clients.findIndex((x) => x.id === c.id); if (i >= 0) this.clients[i] = c; return c; }
  async delete(id: string) { this.clients = this.clients.filter((c) => c.id !== id); }
}

class MockContactRepository implements IContactRepository {
  contacts: Contact[] = [];
  async create(c: Contact) { this.contacts.push(c); return c; }
  async findById(id: string) { return this.contacts.find((c) => c.id === id) ?? null; }
  async findByCpfCnpj(cpf: string) { return this.contacts.find((c) => c.cpfCnpj === cpf) ?? null; }
  async findAll() { return this.contacts; }
  async update(c: Contact) { const i = this.contacts.findIndex((x) => x.id === c.id); if (i >= 0) this.contacts[i] = c; return c; }
  async delete(id: string) { this.contacts = this.contacts.filter((c) => c.id !== id); }
}

class MockRentalRepository implements IRentalRepository {
  rentals: Rental[] = [];
  async create(r: Rental) { this.rentals.push(r); return r; }
  async findById(id: string) { return this.rentals.find((r) => r.id === id) ?? null; }
  async findByPropertyId(propertyId: string) { return this.rentals.filter((r) => r.propertyId === propertyId); }
  async findAll() { return this.rentals; }
  async updatePrerequisites(): Promise<Rental> { throw new Error("Not implemented"); }
  async releaseKeys(): Promise<Rental> { throw new Error("Not implemented"); }
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
  async findContractById(id: string) { return this.contracts.find((c) => c.id === id) ?? null; }
  async findContractsByTenantId(tenantId: string) { return this.contracts.filter((c) => c.tenantId === tenantId); }
  async updateContractDates(contractId: string, dates: { startDate?: number; endDate?: number | null }) {
    const c = this.contracts.find((x) => x.id === contractId);
    if (!c) throw new Error("Contract not found");
    if (dates.startDate !== undefined) c.startDate = dates.startDate;
    if (dates.endDate !== undefined) c.endDate = dates.endDate;
    return c;
  }
  async createContract(c: PropertyContract) { this.contracts.push(c); return c; }
  async createPayment(p: PropertyPayment) { this.payments.push(p); return p; }
  async createInspection(i: PropertyInspection) { this.inspections.push(i); return i; }
  async createMaintenance(m: PropertyMaintenance) { this.maintenances.push(m); return m; }
}

describe("Melhoria: Ajustes de Vigência e Exibição de Contrato (Backend)", () => {
  const setup = () => {
    const propRepo = new MockPropertyRepository();
    const clientRepo = new MockClientRepository();
    const ownerRepo = new MockContactRepository();
    const guarantorRepo = new MockContactRepository();
    const rentalRepo = new MockRentalRepository();
    const historyRepo = new MockHistoryRepository();

    const assemble = new AssembleContractData(
      propRepo,
      clientRepo,
      ownerRepo,
      guarantorRepo,
      rentalRepo,
      undefined,
      historyRepo
    );

    const getTenantActiveContract = new GetTenantActiveContract(
      clientRepo,
      propRepo,
      rentalRepo,
      historyRepo
    );

    const updateDates = new UpdateContractDates(historyRepo, rentalRepo);

    // Dados base
    const property: Property = {
      id: "prop-1",
      title: "Apartamento Jardins 101",
      address: "Rua Oscar Freire, 1000",
      neighborhood: "Cerqueira César",
      bedrooms: 2,
      description: "Apartamento",
      price: 4000,
      status: PropertyStatus.ALUGADO,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    propRepo.properties.push(property);

    const tenant: Client = {
      id: "tenant-1",
      name: "Carlos Locatário",
      cpfCnpj: "111.222.333-44",
      phone: "(11) 98888-1111",
      email: "carlos@email.com",
      type: "TENANT",
      guarantorId: null,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    clientRepo.clients.push(tenant);

    const contract: PropertyContract = {
      id: "contract-1",
      propertyId: "prop-1",
      tenantId: "tenant-1",
      rentalId: "rental-1",
      reference: "LOC-2026-001",
      monthlyRent: 4000,
      startDate: Date.UTC(2026, 0, 1),
      endDate: Date.UTC(2026, 11, 31),
      status: "ACTIVE",
      createdAt: Date.UTC(2026, 0, 1),
    };
    historyRepo.contracts.push(contract);

    const rental: Rental = {
      id: "rental-1",
      propertyId: "prop-1",
      tenantId: "tenant-1",
      monthlyRent: 4000,
      startDate: Date.UTC(2026, 0, 1),
      endDate: Date.UTC(2026, 11, 31),
      dueDay: 10,
      parentRentalId: null,
      formalConsent: null,
      contractSigned: true,
      signaturesNotarized: true,
      initialPaymentsPaid: true,
      keysReleasedAt: Date.UTC(2026, 0, 2),
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 0, 1),
    };
    rentalRepo.rentals.push(rental);

    return {
      propRepo,
      clientRepo,
      ownerRepo,
      guarantorRepo,
      rentalRepo,
      historyRepo,
      assemble,
      getTenantActiveContract,
      updateDates,
      property,
      tenant,
      contract,
      rental,
    };
  };

  describe("parseContractDate helper", () => {
    it("converte strings ISO (YYYY-MM-DD), formato BR (DD/MM/YYYY) e timestamps numéricos", () => {
      const iso = parseContractDate("2026-06-15");
      assert.strictEqual(typeof iso, "number");
      const d1 = new Date(iso!);
      assert.strictEqual(d1.getUTCFullYear(), 2026);
      assert.strictEqual(d1.getUTCMonth() + 1, 6);
      assert.strictEqual(d1.getUTCDate(), 15);

      const br = parseContractDate("25/12/2026");
      assert.strictEqual(typeof br, "number");
      const d2 = new Date(br!);
      assert.strictEqual(d2.getUTCFullYear(), 2026);
      assert.strictEqual(d2.getUTCMonth() + 1, 12);
      assert.strictEqual(d2.getUTCDate(), 25);

      const ts = parseContractDate(1700000000000);
      assert.strictEqual(ts, 1700000000000);

      assert.strictEqual(parseContractDate(null), null);
      assert.strictEqual(parseContractDate(undefined), null);
      assert.strictEqual(parseContractDate(""), null);
    });
  });

  describe("AssembleContractData com flexibilização de datas de vigência", () => {
    it("aplica datas de vigência customizadas passadas pelo formulário e calcula prazos", async () => {
      const { assemble, property } = setup();

      const resultado = await assemble.execute({
        propertyId: property.id,
        startDate: "2026-03-01",
        endDate: "2027-02-28",
      });

      assert.ok(resultado.effectiveDates);
      assert.strictEqual(resultado.effectiveDates.startDateFormatted, "01/03/2026");
      assert.strictEqual(resultado.effectiveDates.endDateFormatted, "28/02/2027");
      assert.strictEqual(resultado.effectiveDates.prazoMeses, 12);

      // Deve refletir as datas dentro do texto preenchido do contrato
      assert.ok(resultado.filledContent.includes("01/03/2026"));
      assert.ok(resultado.filledContent.includes("28/02/2027"));
    });

    it("rejeita data de término igual ou anterior à data de início", async () => {
      const { assemble, property } = setup();

      await assert.rejects(
        async () => {
          await assemble.execute({
            propertyId: property.id,
            startDate: "2026-10-01",
            endDate: "2026-09-01",
          });
        },
        {
          message: "A data de término do contrato deve ser posterior à data de início.",
        }
      );
    });

    it("salva as novas datas no contrato ativo quando saveDates for true", async () => {
      const { assemble, property, historyRepo } = setup();

      await assemble.execute({
        propertyId: property.id,
        startDate: "2026-05-01",
        endDate: "2028-04-30",
        saveDates: true,
      });

      const updatedContract = historyRepo.contracts.find((c) => c.propertyId === property.id)!;
      const startD = new Date(updatedContract.startDate);
      const endD = new Date(updatedContract.endDate!);
      assert.strictEqual(startD.getUTCFullYear(), 2026);
      assert.strictEqual(startD.getUTCMonth() + 1, 5);
      assert.strictEqual(endD.getUTCFullYear(), 2028);
      assert.strictEqual(endD.getUTCMonth() + 1, 4);
    });
  });

  describe("GetTenantActiveContract (Exibição da Data de Término na Ficha do Locatário)", () => {
    it("retorna o contrato ativo com datas formatadas, dias restantes e status", async () => {
      const { getTenantActiveContract, tenant } = setup();

      const resumo = await getTenantActiveContract.execute(tenant.id);

      assert.ok(resumo);
      assert.strictEqual(resumo.propertyTitle, "Apartamento Jardins 101");
      assert.strictEqual(resumo.monthlyRent, 4000);
      assert.strictEqual(resumo.startDateFormatted, "01/01/2026");
      assert.strictEqual(resumo.endDateFormatted, "31/12/2026");
      assert.strictEqual(typeof resumo.daysRemaining, "number");
      assert.strictEqual(resumo.status, "ACTIVE");
    });

    it("retorna null quando o locatário não possui nenhum contrato ativo vinculado", async () => {
      const { getTenantActiveContract, clientRepo } = setup();

      const newTenant: Client = {
        id: "tenant-sem-contrato",
        name: "Mariana Sem Imóvel",
        cpfCnpj: "999.888.777-66",
        phone: null,
        email: null,
        type: "TENANT",
        guarantorId: null,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };
      clientRepo.clients.push(newTenant);

      const resumo = await getTenantActiveContract.execute("tenant-sem-contrato");
      assert.strictEqual(resumo, null);
    });

    it("lança erro semântico quando o locatário não é encontrado", async () => {
      const { getTenantActiveContract } = setup();

      await assert.rejects(
        async () => {
          await getTenantActiveContract.execute("tenant-inexistente");
        },
        {
          message: 'Locatário com id "tenant-inexistente" não encontrado.',
        }
      );
    });
  });

  describe("UpdateContractDates (Atualização isolada de vigência)", () => {
    it("atualiza datas de início e término com validação temporal", async () => {
      const { updateDates, contract } = setup();

      const atualizado = await updateDates.execute({
        contractId: contract.id,
        startDate: "2026-06-01",
        endDate: "2027-05-31",
      });

      assert.strictEqual(new Date(atualizado.startDate).getUTCMonth() + 1, 6);
      assert.strictEqual(new Date(atualizado.endDate!).getUTCMonth() + 1, 5);
      assert.strictEqual(new Date(atualizado.endDate!).getUTCFullYear(), 2027);
    });

    it("rejeita quando data de término for menor ou igual à de início", async () => {
      const { updateDates, contract } = setup();

      await assert.rejects(
        async () => {
          await updateDates.execute({
            contractId: contract.id,
            startDate: "2026-06-01",
            endDate: "2026-05-31",
          });
        },
        {
          message: "A data de término do contrato deve ser posterior à data de início.",
        }
      );
    });
  });
});
