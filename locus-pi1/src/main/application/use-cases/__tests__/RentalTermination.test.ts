import { describe, it } from "node:test";
import assert from "node:assert";
import { GetRentalTerminationSummary } from "../GetRentalTerminationSummary";
import { CancelRental } from "../CancelRental";
import { Rental } from "../../../domain/entities/Rental";
import { PropertyContract, PropertyHistory, PropertyPayment, PropertyInspection } from "../../../domain/entities/PropertyHistory";
import { IRentalRepository } from "../../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../../domain/repositories/IPropertyHistoryRepository";
import { IInspectionRepository } from "../../../domain/repositories/IInspectionRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";

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
  async updatePrerequisites() {
    throw new Error("Not implemented");
  }
  async releaseKeys() {
    throw new Error("Not implemented");
  }
  async cancel(id: string, cancelledAt: number) {
    const rentalIndex = this.rentals.findIndex((r) => r.id === id);
    if (rentalIndex === -1) throw new Error("Rental not found");
    this.rentals.splice(rentalIndex, 1);
  }
}

class MockHistoryRepository implements IPropertyHistoryRepository {
  contracts: PropertyContract[] = [];
  payments: PropertyPayment[] = [];
  inspections: PropertyInspection[] = [];

  async findByPropertyId(propertyId: string): Promise<PropertyHistory> {
    return {
      contracts: this.contracts.filter((c) => c.propertyId === propertyId),
      payments: this.payments.filter((p) => p.propertyId === propertyId),
      inspections: this.inspections.filter((i) => i.propertyId === propertyId),
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
  async createInspection(inspection: PropertyInspection) {
    this.inspections.push(inspection);
    return inspection;
  }
  async createMaintenance() {
    throw new Error("Not implemented");
  }
}

class MockInspectionRepository implements IInspectionRepository {
  inspections: PropertyInspection[] = [];

  async findByPropertyId(propertyId: string) {
    return this.inspections.filter((i) => i.propertyId === propertyId);
  }
  async findByContractId(contractId: string) {
    return this.inspections.filter((i) => i.contractId === contractId);
  }
  async record() {
    throw new Error("Not implemented");
  }
}

describe("HU-14: Quebra de Contrato e Desassociação com Verificação Financeira", () => {
  it("retorna resumo com alerta de débitos pendentes quando houver parcelas em atraso", async () => {
    const rentalRepo = new MockRentalRepository();
    const historyRepo = new MockHistoryRepository();
    const inspectionRepo = new MockInspectionRepository();
    const clientRepo = {
      findById: async (id: string) => (id === "tenant-1" ? { id: "tenant-1", name: "Carlos Locatário", type: "TENANT" } : null),
    } as unknown as IClientRepository;
    const propertyRepo = {
      findById: async (id: string) => (id === "prop-1" ? { id: "prop-1", title: "Apartamento 101", address: "Rua das Flores" } : null),
    } as unknown as IPropertyRepository;

    // Locação iniciada em 01/01/2026, com vencimento dia 10 e valor R$ 1.500
    const startTimestamp = new Date(Date.UTC(2026, 0, 1)).getTime();
    const rental: Rental = {
      id: "rental-1",
      propertyId: "prop-1",
      tenantId: "tenant-1",
      monthlyRent: 1500,
      startDate: startTimestamp,
      endDate: null,
      dueDay: 10,
      parentRentalId: null,
      formalConsent: null,
      contractSigned: true,
      signaturesNotarized: true,
      initialPaymentsPaid: true,
      keysReleasedAt: null,
      createdAt: startTimestamp,
      updatedAt: startTimestamp,
    };
    await rentalRepo.create(rental);

    const contract: PropertyContract = {
      id: "contract-1",
      propertyId: "prop-1",
      tenantId: "tenant-1",
      rentalId: "rental-1",
      reference: "LOC-rental-1",
      monthlyRent: 1500,
      startDate: startTimestamp,
      endDate: null,
      status: "ACTIVE",
      createdAt: startTimestamp,
    };
    await historyRepo.createContract(contract);

    // Registra apenas 1 pagamento referente a Janeiro/2026
    await historyRepo.createPayment({
      id: "pay-1",
      propertyId: "prop-1",
      contractId: "contract-1",
      amount: 1500,
      paidAt: new Date(Date.UTC(2026, 0, 10)).getTime(),
      description: "Aluguel referente a Janeiro/2026",
      createdAt: startTimestamp,
    });

    const useCase = new GetRentalTerminationSummary(
      rentalRepo,
      historyRepo,
      inspectionRepo,
      clientRepo,
      propertyRepo
    );

    // Consulta em 15/03/2026 (três parcelas esperadas: 10/01, 10/02 e 10/03 = R$ 4.500, pago R$ 1.500 => saldo R$ 3.000)
    const marchQueryTime = new Date(Date.UTC(2026, 2, 15)).getTime();
    const summary = await useCase.execute("rental-1", marchQueryTime);

    assert.equal(summary.rentalId, "rental-1");
    assert.equal(summary.tenantName, "Carlos Locatário");
    assert.equal(summary.propertyTitle, "Apartamento 101");
    assert.equal(summary.totalPaid, 1500);
    assert.equal(summary.totalExpected, 4500);
    assert.equal(summary.pendingAmount, 3000);
    assert.equal(summary.hasPendingDebts, true);
    assert.ok(summary.debtAlertMessage?.includes("3.000,00"));
    assert.equal(summary.paidPayments.length, 1);
    assert.equal(summary.pendingDebts.length, 2); // Fevereiro e Março em aberto
    assert.equal(summary.pendingDebts[0].referenceMonth, "02/2026");
    assert.equal(summary.pendingDebts[1].referenceMonth, "03/2026");
    assert.equal(summary.canTerminate, true); // Chaves não foram entregues, então não exige vistoria
  });

  it("identifica locatário em dia sem débitos pendentes", async () => {
    const rentalRepo = new MockRentalRepository();
    const historyRepo = new MockHistoryRepository();

    const startTimestamp = new Date(Date.UTC(2026, 0, 1)).getTime();
    const rental: Rental = {
      id: "rental-paid",
      propertyId: "prop-2",
      tenantId: "tenant-2",
      monthlyRent: 2000,
      startDate: startTimestamp,
      dueDay: 5,
      parentRentalId: null,
      formalConsent: null,
      contractSigned: true,
      signaturesNotarized: true,
      initialPaymentsPaid: true,
      keysReleasedAt: null,
      createdAt: startTimestamp,
      updatedAt: startTimestamp,
    };
    await rentalRepo.create(rental);

    await historyRepo.createContract({
      id: "contract-paid",
      propertyId: "prop-2",
      tenantId: "tenant-2",
      rentalId: "rental-paid",
      reference: "LOC-rental-paid",
      monthlyRent: 2000,
      startDate: startTimestamp,
      endDate: null,
      status: "ACTIVE",
      createdAt: startTimestamp,
    });

    // Paga integralmente as parcelas devidas até fevereiro (2 parcelas de 2000 = 4000)
    await historyRepo.createPayment({
      id: "pay-1",
      propertyId: "prop-2",
      contractId: "contract-paid",
      amount: 4000,
      paidAt: new Date(Date.UTC(2026, 1, 5)).getTime(),
      description: "Aluguel referente a Jan e Fev",
      createdAt: startTimestamp,
    });

    const useCase = new GetRentalTerminationSummary(rentalRepo, historyRepo);
    const febQueryTime = new Date(Date.UTC(2026, 1, 15)).getTime();
    const summary = await useCase.execute("rental-paid", febQueryTime);

    assert.equal(summary.hasPendingDebts, false);
    assert.equal(summary.pendingAmount, 0);
    assert.equal(summary.debtAlertMessage, null);
    assert.equal(summary.pendingDebts.length, 0);
  });

  it("exige vistoria de saída quando chaves foram liberadas (RN03)", async () => {
    const rentalRepo = new MockRentalRepository();
    const historyRepo = new MockHistoryRepository();
    const inspectionRepo = new MockInspectionRepository();

    const startTimestamp = new Date(Date.UTC(2026, 0, 1)).getTime();
    const rental: Rental = {
      id: "rental-keys",
      propertyId: "prop-3",
      tenantId: "tenant-3",
      monthlyRent: 1200,
      startDate: startTimestamp,
      dueDay: 10,
      parentRentalId: null,
      formalConsent: null,
      contractSigned: true,
      signaturesNotarized: true,
      initialPaymentsPaid: true,
      keysReleasedAt: startTimestamp, // Chaves entregues!
      createdAt: startTimestamp,
      updatedAt: startTimestamp,
    };
    await rentalRepo.create(rental);

    await historyRepo.createContract({
      id: "contract-keys",
      propertyId: "prop-3",
      tenantId: "tenant-3",
      rentalId: "rental-keys",
      reference: "LOC-rental-keys",
      monthlyRent: 1200,
      startDate: startTimestamp,
      endDate: null,
      status: "ACTIVE",
      createdAt: startTimestamp,
    });

    const useCase = new GetRentalTerminationSummary(rentalRepo, historyRepo, inspectionRepo);
    const summaryWithoutInspection = await useCase.execute("rental-keys");

    assert.equal(summaryWithoutInspection.keysReleased, true);
    assert.equal(summaryWithoutInspection.exitInspectionRequired, true);
    assert.equal(summaryWithoutInspection.hasExitInspection, false);
    assert.equal(summaryWithoutInspection.canTerminate, false);
    assert.ok(summaryWithoutInspection.blockReason?.includes("RN03"));

    // Adiciona vistoria de saída
    inspectionRepo.inspections.push({
      id: "insp-exit",
      propertyId: "prop-3",
      contractId: "contract-keys",
      type: "EXIT",
      inspectedAt: Date.now(),
      description: "Vistoria de saída realizada",
      reportReference: null,
      createdAt: Date.now(),
    });

    const summaryWithInspection = await useCase.execute("rental-keys");
    assert.equal(summaryWithInspection.hasExitInspection, true);
    assert.equal(summaryWithInspection.canTerminate, true);
    assert.equal(summaryWithInspection.blockReason, null);
  });

  it("CancelRental cancela locação com sucesso", async () => {
    const rentalRepo = new MockRentalRepository();
    const startTimestamp = Date.now();
    await rentalRepo.create({
      id: "rental-to-cancel",
      propertyId: "prop-4",
      tenantId: "tenant-4",
      monthlyRent: 1000,
      startDate: startTimestamp,
      dueDay: 10,
      parentRentalId: null,
      formalConsent: null,
      contractSigned: true,
      signaturesNotarized: true,
      initialPaymentsPaid: true,
      keysReleasedAt: null,
      createdAt: startTimestamp,
      updatedAt: startTimestamp,
    });

    const cancelRental = new CancelRental(rentalRepo);
    await cancelRental.execute("rental-to-cancel");

    assert.equal(await rentalRepo.findById("rental-to-cancel"), null);
  });
});
