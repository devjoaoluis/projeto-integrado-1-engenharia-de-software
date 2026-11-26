import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateOverdueCharges,
  OverdueNotification,
} from "../../../domain/entities/OverdueRent";
import { CheckOverdueRents } from "../CheckOverdueRents";
import { TriggerOverdueAlerts } from "../TriggerOverdueAlerts";
import { SettleOverdueDebt } from "../SettleOverdueDebt";
import { ListOverdueNotifications } from "../ListOverdueNotifications";
import { Rental } from "../../../domain/entities/Rental";
import {
  PropertyContract,
  PropertyHistory,
  PropertyPayment,
  PropertyInspection,
  PropertyMaintenance,
} from "../../../domain/entities/PropertyHistory";
import { IRentalRepository } from "../../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../../domain/repositories/IPropertyHistoryRepository";
import {
  IOverdueNotificationRepository,
  OverdueNotificationFilter,
} from "../../../domain/repositories/IOverdueNotificationRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { Client } from "../../../domain/entities/Client";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { SearchPropertiesParams, SearchPropertiesResult } from "../../../../shared/types/properties";

class MockRentalRepository implements IRentalRepository {
  rentals: Rental[] = [];

  async create(rental: Rental) {
    this.rentals.push(rental);
    return rental;
  }
  async findById(id: string) {
    return this.rentals.find((r) => r.id === id) ?? null;
  }
  async findByPropertyId(propertyId: string) {
    return this.rentals.filter((r) => r.propertyId === propertyId);
  }
  async findAll() {
    return this.rentals;
  }
  async updatePrerequisites(): Promise<Rental> {
    throw new Error("Not implemented");
  }
  async releaseKeys(): Promise<Rental> {
    throw new Error("Not implemented");
  }
  async cancel(id: string) {
    const idx = this.rentals.findIndex((r) => r.id === id);
    if (idx !== -1) this.rentals.splice(idx, 1);
  }
}

class MockHistoryRepository implements IPropertyHistoryRepository {
  contracts: PropertyContract[] = [];
  payments: PropertyPayment[] = [];

  async findByPropertyId(propertyId: string): Promise<PropertyHistory> {
    return {
      contracts: this.contracts.filter((c) => c.propertyId === propertyId),
      payments: this.payments.filter((p) => p.propertyId === propertyId),
      inspections: [],
      maintenances: [],
    };
  }
  async findContractById(id: string) {
    return this.contracts.find((c) => c.id === id) ?? null;
  }
  async createContract(contract: PropertyContract) {
    this.contracts.push(contract);
    return contract;
  }
  async createPayment(payment: PropertyPayment) {
    this.payments.push(payment);
    return payment;
  }
  async createInspection(i: PropertyInspection) {
    return i;
  }
  async createMaintenance(m: PropertyMaintenance) {
    return m;
  }
}

class MockNotificationRepository implements IOverdueNotificationRepository {
  notifications: OverdueNotification[] = [];

  async create(n: OverdueNotification) {
    this.notifications.push(n);
    return n;
  }
  async findByRentalAndMonth(rentalId: string, referenceMonth: string) {
    return this.notifications.filter(
      (n) => n.rentalId === rentalId && n.referenceMonth === referenceMonth
    );
  }
  async findLatestForRentalMonth(rentalId: string, referenceMonth: string) {
    const matches = this.notifications.filter(
      (n) => n.rentalId === rentalId && n.referenceMonth === referenceMonth
    );
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }
  async list(filter?: OverdueNotificationFilter) {
    let result = [...this.notifications];
    if (filter?.rentalId) {
      result = result.filter((n) => n.rentalId === filter.rentalId);
    }
    if (filter?.tenantId) {
      result = result.filter((n) => n.tenantId === filter.tenantId);
    }
    if (filter?.referenceMonth) {
      result = result.filter((n) => n.referenceMonth === filter.referenceMonth);
    }
    if (filter?.since) {
      result = result.filter((n) => n.createdAt >= filter.since!);
    }
    return result;
  }
}

class MockClientRepository implements IClientRepository {
  clients: Client[] = [];
  async findById(id: string): Promise<Client | null> {
    return this.clients.find((c) => c.id === id) ?? null;
  }
  async findByCpfCnpj(_cpfCnpj: string): Promise<Client | null> {
    return null;
  }
  async create(c: Client): Promise<Client> {
    this.clients.push(c);
    return c;
  }
  async findAll(): Promise<Client[]> {
    return this.clients;
  }
  async update(client: Client): Promise<Client> {
    const idx = this.clients.findIndex((c) => c.id === client.id);
    if (idx === -1) throw new Error("Not found");
    this.clients[idx] = client;
    return client;
  }
  async delete(id: string): Promise<void> {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx !== -1) this.clients.splice(idx, 1);
  }
}

class MockPropertyRepository implements IPropertyRepository {
  properties: Property[] = [];
  async findById(id: string): Promise<Property | null> {
    return this.properties.find((p) => p.id === id) ?? null;
  }
  async create(p: Property): Promise<Property> {
    this.properties.push(p);
    return p;
  }
  async findAll(): Promise<Property[]> {
    return this.properties;
  }
  async update(p: Property): Promise<Property> {
    const idx = this.properties.findIndex((item) => item.id === p.id);
    if (idx !== -1) this.properties[idx] = p;
    return p;
  }
  async delete(id: string): Promise<void> {
    const idx = this.properties.findIndex((item) => item.id === id);
    if (idx !== -1) this.properties.splice(idx, 1);
  }
  async search(_params: SearchPropertiesParams): Promise<SearchPropertiesResult> {
    return { items: this.properties, total: this.properties.length, offset: 0, limit: 10 };
  }
}

describe("HU-10: Notificação de Atraso e Controle de Inadimplência (RF08)", () => {
  const msInDay = 24 * 60 * 60 * 1000;

  describe("Cálculo de Mora e Multa (RN06)", () => {
    it("retorna zero encargos quando o pagamento não está em atraso", () => {
      const dueDate = new Date("2026-10-10T23:59:59.999Z").getTime();
      const current = new Date("2026-10-10T12:00:00.000Z").getTime();
      const result = calculateOverdueCharges(1000, dueDate, current);

      assert.equal(result.daysOverdue, 0);
      assert.equal(result.interestAmount, 0);
      assert.equal(result.fineAmount, 0);
      assert.equal(result.totalAmount, 1000);
      assert.equal(result.isOverTwoMonths, false);
    });

    it("aplica estritamente 1% ao mês pro rata die de juros e 2% de multa por dia de atraso (RN06)", () => {
      const dueDate = new Date("2026-10-01T23:59:59.999Z").getTime();
      // 10 dias depois
      const current = dueDate + 10 * msInDay;
      const originalAmount = 1000;
      const result = calculateOverdueCharges(originalAmount, dueDate, current);

      assert.equal(result.daysOverdue, 10);
      // Juros: (0.01 / 30) * 10 * 1000 = 3.33
      assert.equal(result.interestAmount, 3.33);
      // Multa: 0.02 * 10 * 1000 = 200.00
      assert.equal(result.fineAmount, 200);
      // Total: 1000 + 3.33 + 200 = 1203.33
      assert.equal(result.totalAmount, 1203.33);
      assert.equal(result.isOverTwoMonths, false);
    });

    it("sinaliza mais de 2 meses de atraso (>60 dias) para conformidade com a RN05", () => {
      const dueDate = new Date("2026-08-01T23:59:59.999Z").getTime();
      // 61 dias depois
      const current = dueDate + 61 * msInDay;
      const result = calculateOverdueCharges(1000, dueDate, current);

      assert.equal(result.daysOverdue, 61);
      assert.equal(result.isOverTwoMonths, true);
    });

    it("mantém isOverTwoMonths falso com exatamente 60 dias de atraso", () => {
      const dueDate = new Date("2026-08-01T23:59:59.999Z").getTime();
      const current = dueDate + 60 * msInDay;
      const result = calculateOverdueCharges(1000, dueDate, current);

      assert.equal(result.daysOverdue, 60);
      assert.equal(result.isOverTwoMonths, false);
    });
  });

  describe("Caso de Uso: CheckOverdueRents", () => {
    it("identifica locação com parcelas vencidas e calcula acréscimos moratórios", async () => {
      const rentalRepo = new MockRentalRepository();
      const historyRepo = new MockHistoryRepository();
      const clientRepo = new MockClientRepository();
      const propertyRepo = new MockPropertyRepository();

      await clientRepo.create({
        id: "tenant-1",
        name: "Carlos Locatário",
        email: "carlos@email.com",
        phone: "11999999999",
        cpfCnpj: "123.456.789-00",
        type: "TENANT",
        guarantorId: null,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await propertyRepo.create({
        id: "prop-1",
        title: "Apartamento Centro",
        address: "Rua Principal, 100",
        price: 1500,
        status: PropertyStatus.ALUGADO,
        neighborhood: "Centro",
        bedrooms: 2,
        description: null,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Locação iniciada em 01/08/2026 com vencimento todo dia 10
      const startDate = new Date(Date.UTC(2026, 7, 1)).getTime(); // 01/08/2026
      await rentalRepo.create({
        id: "rent-1",
        propertyId: "prop-1",
        tenantId: "tenant-1",
        monthlyRent: 1500,
        startDate,
        dueDay: 10,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: startDate,
        createdAt: startDate,
        updatedAt: startDate,
      });

      // Contrato registrado no histórico
      await historyRepo.createContract({
        id: "contract-1",
        propertyId: "prop-1",
        tenantId: "tenant-1",
        rentalId: "rent-1",
        reference: "LOC-rent-1",
        monthlyRent: 1500,
        startDate,
        endDate: null,
        status: "ACTIVE",
        createdAt: startDate,
      });

      // Simulação: estamos no final do dia 25/08/2026 (vencimento foi em 10/08/2026 23:59 -> 15 dias de atraso)
      const currentTimestamp = new Date(Date.UTC(2026, 7, 25, 23, 59, 59, 999)).getTime();

      const useCase = new CheckOverdueRents(rentalRepo, historyRepo, clientRepo, propertyRepo);
      const result = await useCase.execute({ currentTimestamp });

      assert.equal(result.debts.length, 1);
      const debt = result.debts[0];
      assert.equal(debt.rentalId, "rent-1");
      assert.equal(debt.tenantName, "Carlos Locatário");
      assert.equal(debt.propertyTitle, "Apartamento Centro");
      assert.equal(debt.referenceMonth, "08/2026");
      assert.equal(debt.daysOverdue, 15);
      assert.equal(debt.originalAmount, 1500);

      // Juros: (0.01 / 30) * 15 * 1500 = 7.50
      assert.equal(debt.interestAmount, 7.5);
      // Multa: 0.02 * 15 * 1500 = 450.00
      assert.equal(debt.fineAmount, 450);
      assert.equal(debt.totalAmount, 1957.5);
      assert.equal(debt.isOverTwoMonths, false);
      assert.equal(debt.autoSettlementBlocked, false);

      assert.equal(result.summary.totalOverdueContracts, 1);
      assert.equal(result.summary.totalDebtsCount, 1);
      assert.equal(result.summary.totalOriginalAmount, 1500);
      assert.equal(result.summary.totalDueAmount, 1957.5);
      assert.equal(result.summary.totalCriticalDebts, 0);
    });

    it("reconhece pagamentos efetuados e não gera débitos indevidos", async () => {
      const rentalRepo = new MockRentalRepository();
      const historyRepo = new MockHistoryRepository();

      const startDate = new Date(Date.UTC(2026, 7, 1)).getTime(); // 01/08/2026
      await rentalRepo.create({
        id: "rent-paid",
        propertyId: "prop-paid",
        tenantId: "tenant-paid",
        monthlyRent: 2000,
        startDate,
        dueDay: 5,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: startDate,
        createdAt: startDate,
        updatedAt: startDate,
      });

      await historyRepo.createContract({
        id: "c-paid",
        propertyId: "prop-paid",
        tenantId: "tenant-paid",
        rentalId: "rent-paid",
        reference: "LOC-rent-paid",
        monthlyRent: 2000,
        startDate,
        endDate: null,
        status: "ACTIVE",
        createdAt: startDate,
      });

      // Pagamento pontual de 2000 efetuado
      await historyRepo.createPayment({
        id: "pay-1",
        propertyId: "prop-paid",
        contractId: "c-paid",
        amount: 2000,
        paidAt: new Date(Date.UTC(2026, 7, 5)).getTime(),
        description: "Aluguel pago",
        createdAt: startDate,
      });

      const currentTimestamp = new Date(Date.UTC(2026, 7, 20)).getTime();
      const useCase = new CheckOverdueRents(rentalRepo, historyRepo);
      const result = await useCase.execute({ currentTimestamp });

      assert.equal(result.debts.length, 0);
      assert.equal(result.summary.totalDebtsCount, 0);
    });
  });

  describe("Caso de Uso: TriggerOverdueAlerts", () => {
    it("dispara notificações de atraso com cálculo e mensagem informativa", async () => {
      const rentalRepo = new MockRentalRepository();
      const historyRepo = new MockHistoryRepository();
      const notifRepo = new MockNotificationRepository();

      const startDate = new Date(Date.UTC(2026, 7, 1)).getTime();
      await rentalRepo.create({
        id: "rent-notif",
        propertyId: "prop-notif",
        tenantId: "tenant-notif",
        monthlyRent: 1000,
        startDate,
        dueDay: 5,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: startDate,
        createdAt: startDate,
        updatedAt: startDate,
      });

      await historyRepo.createContract({
        id: "c-notif",
        propertyId: "prop-notif",
        tenantId: "tenant-notif",
        rentalId: "rent-notif",
        reference: "LOC-notif",
        monthlyRent: 1000,
        startDate,
        endDate: null,
        status: "ACTIVE",
        createdAt: startDate,
      });

      const currentTimestamp = new Date(Date.UTC(2026, 7, 15)).getTime(); // 10 dias após vencimento
      const checkUseCase = new CheckOverdueRents(rentalRepo, historyRepo);
      const triggerUseCase = new TriggerOverdueAlerts(checkUseCase, notifRepo);

      const result = await triggerUseCase.execute({ currentTimestamp });
      assert.equal(result.triggeredCount, 1);
      assert.equal(result.notifications.length, 1);
      assert.ok(result.notifications[0].message.includes("RN06"));
      assert.ok(result.notifications[0].message.includes("08/2026"));

      // Segunda chamada no mesmo dia deve pular para evitar spam
      const secondCall = await triggerUseCase.execute({ currentTimestamp: currentTimestamp + 3600000 });
      assert.equal(secondCall.triggeredCount, 0);
      assert.equal(secondCall.skippedCount, 1);

      // Chamada forçada deve disparar
      const forcedCall = await triggerUseCase.execute({ currentTimestamp: currentTimestamp + 3600000, force: true });
      assert.equal(forcedCall.triggeredCount, 1);
    });
  });

  describe("Caso de Uso: SettleOverdueDebt e RN05 (Bloqueio de Baixa Automática)", () => {
    it("RN05: Bloqueia a baixa automática para débitos com mais de 2 meses de atraso (>60 dias)", async () => {
      const rentalRepo = new MockRentalRepository();
      const historyRepo = new MockHistoryRepository();

      const startDate = new Date(Date.UTC(2026, 5, 1)).getTime(); // 01/06/2026
      await rentalRepo.create({
        id: "rent-old",
        propertyId: "prop-old",
        tenantId: "tenant-old",
        monthlyRent: 1000,
        startDate,
        dueDay: 5,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: startDate,
        createdAt: startDate,
        updatedAt: startDate,
      });

      await historyRepo.createContract({
        id: "c-old",
        propertyId: "prop-old",
        tenantId: "tenant-old",
        rentalId: "rent-old",
        reference: "LOC-old",
        monthlyRent: 1000,
        startDate,
        endDate: null,
        status: "ACTIVE",
        createdAt: startDate,
      });

      // Data atual: 15/09/2026 (> 90 dias após 05/06/2026)
      const currentTimestamp = new Date(Date.UTC(2026, 8, 15)).getTime();
      const checkUseCase = new CheckOverdueRents(rentalRepo, historyRepo);
      const settleUseCase = new SettleOverdueDebt(checkUseCase, historyRepo);

      // Baixa automática deve ser expressamente bloqueada conforme RN05
      await assert.rejects(
        settleUseCase.execute({
          rentalId: "rent-old",
          referenceMonth: "06/2026",
          automatic: true,
          paidAt: currentTimestamp,
        }),
        (err: Error) => {
          assert.ok(
            err.message.includes("RN05") &&
            err.message.includes("Baixa automática bloqueada"),
            `Esperado erro de RN05, obtido: ${err.message}`
          );
          return true;
        }
      );

      // Nenhuma baixa gravada no banco
      const historyAfter = await historyRepo.findByPropertyId("prop-old");
      assert.equal(historyAfter.payments.length, 0);
    });

    it("Permite a baixa manual para débitos com mais de 2 meses de atraso pelo corretor", async () => {
      const rentalRepo = new MockRentalRepository();
      const historyRepo = new MockHistoryRepository();

      const startDate = new Date(Date.UTC(2026, 5, 1)).getTime();
      await rentalRepo.create({
        id: "rent-manual",
        propertyId: "prop-manual",
        tenantId: "tenant-manual",
        monthlyRent: 1000,
        startDate,
        dueDay: 5,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: startDate,
        createdAt: startDate,
        updatedAt: startDate,
      });

      await historyRepo.createContract({
        id: "c-manual",
        propertyId: "prop-manual",
        tenantId: "tenant-manual",
        rentalId: "rent-manual",
        reference: "LOC-manual",
        monthlyRent: 1000,
        startDate,
        endDate: null,
        status: "ACTIVE",
        createdAt: startDate,
      });

      const currentTimestamp = new Date(Date.UTC(2026, 8, 15)).getTime();
      const checkUseCase = new CheckOverdueRents(rentalRepo, historyRepo);
      const settleUseCase = new SettleOverdueDebt(checkUseCase, historyRepo);

      // Baixa manual (automatic = false) é aceita
      const res = await settleUseCase.execute({
        rentalId: "rent-manual",
        referenceMonth: "06/2026",
        automatic: false,
        paidAt: currentTimestamp,
      });

      assert.equal(res.success, true);
      const historyAfter = await historyRepo.findByPropertyId("prop-manual");
      assert.equal(historyAfter.payments.length, 1);
      assert.ok(historyAfter.payments[0].description.includes("Baixa Manual"));
    });

    it("Permite baixa automática quando o atraso é menor ou igual a 60 dias", async () => {
      const rentalRepo = new MockRentalRepository();
      const historyRepo = new MockHistoryRepository();

      const startDate = new Date(Date.UTC(2026, 7, 1)).getTime(); // 01/08/2026
      await rentalRepo.create({
        id: "rent-auto-ok",
        propertyId: "prop-auto-ok",
        tenantId: "tenant-auto-ok",
        monthlyRent: 1200,
        startDate,
        dueDay: 10,
        parentRentalId: null,
        formalConsent: null,
        contractSigned: true,
        signaturesNotarized: true,
        initialPaymentsPaid: true,
        keysReleasedAt: startDate,
        createdAt: startDate,
        updatedAt: startDate,
      });

      await historyRepo.createContract({
        id: "c-auto-ok",
        propertyId: "prop-auto-ok",
        tenantId: "tenant-auto-ok",
        rentalId: "rent-auto-ok",
        reference: "LOC-auto-ok",
        monthlyRent: 1200,
        startDate,
        endDate: null,
        status: "ACTIVE",
        createdAt: startDate,
      });

      // 20 dias após o vencimento (10/08 -> 30/08)
      const currentTimestamp = new Date(Date.UTC(2026, 7, 30)).getTime();
      const checkUseCase = new CheckOverdueRents(rentalRepo, historyRepo);
      const settleUseCase = new SettleOverdueDebt(checkUseCase, historyRepo);

      const res = await settleUseCase.execute({
        rentalId: "rent-auto-ok",
        referenceMonth: "08/2026",
        automatic: true,
        paidAt: currentTimestamp,
      });

      assert.equal(res.success, true);
      const historyAfter = await historyRepo.findByPropertyId("prop-auto-ok");
      assert.equal(historyAfter.payments.length, 1);
      assert.ok(historyAfter.payments[0].description.includes("Baixa Automática"));
    });
  });

  describe("Caso de Uso: ListOverdueNotifications", () => {
    it("filtra notificações por locação e mês de referência", async () => {
      const repo = new MockNotificationRepository();
      await repo.create({
        id: "n-1",
        rentalId: "r-1",
        contractId: "c-1",
        tenantId: "t-1",
        referenceMonth: "08/2026",
        dueDate: 1000,
        daysOverdue: 5,
        originalAmount: 1000,
        interestAmount: 1.67,
        fineAmount: 100,
        totalAmount: 1101.67,
        message: "Aviso",
        channel: "SYSTEM",
        createdAt: 2000,
      });
      await repo.create({
        id: "n-2",
        rentalId: "r-2",
        contractId: "c-2",
        tenantId: "t-2",
        referenceMonth: "08/2026",
        dueDate: 1000,
        daysOverdue: 10,
        originalAmount: 1500,
        interestAmount: 5,
        fineAmount: 300,
        totalAmount: 1805,
        message: "Aviso",
        channel: "EMAIL",
        createdAt: 3000,
      });

      const listUseCase = new ListOverdueNotifications(repo);
      const all = await listUseCase.execute();
      assert.equal(all.length, 2);

      const filtered = await listUseCase.execute({ rentalId: "r-1" });
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].rentalId, "r-1");
    });
  });
});
