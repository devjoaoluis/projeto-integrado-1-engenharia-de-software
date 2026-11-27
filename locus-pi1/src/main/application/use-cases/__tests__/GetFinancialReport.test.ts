import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FINANCIAL_LATE_RULES } from "../../../domain/entities/FinancialCharges";
import { GlobalFinancialSettings } from "../../../domain/entities/FinancialSettings";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { PropertyPayment } from "../../../domain/entities/PropertyHistory";
import { Rental } from "../../../domain/entities/Rental";
import { Contact } from "../../../domain/entities/Contact";
import { IOwnerRepository } from "../../../domain/repositories/IOwnerRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IFinancialRepository } from "../../../domain/repositories/IFinancialRepository";
import { IRentalRepository } from "../../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../../domain/repositories/IPropertyHistoryRepository";
import { PaymentItem, ListPayments } from "../ListPayments";
import { GetFinancialReport } from "../GetFinancialReport";

function payment(overrides: Partial<PaymentItem>): PaymentItem {
  return {
    id: "installment-1",
    rentalId: "rental-1",
    contractId: "contract-1",
    propertyId: "property-1",
    propertyTitle: "Casa",
    ownerId: "owner-1",
    tenantId: "tenant-1",
    tenantName: "João",
    clientId: "tenant-1",
    amount: 1_000,
    amountCents: 100_000,
    rentAmountCents: 100_000,
    expensesAmountCents: 0,
    receivedAmountCents: 0,
    principalOutstandingCents: 100_000,
    rentOutstandingCents: 100_000,
    expensesOutstandingCents: 0,
    fineOutstandingCents: 0,
    interestOutstandingCents: 0,
    totalAmount: 1_000,
    fineAmount: 0,
    interestAmount: 0,
    daysOverdue: 0,
    dueDate: Date.UTC(2026, 2, 10, 23, 59, 59, 999),
    referenceMonth: "03/2026",
    receiptPath: null,
    receipts: [],
    installmentItems: [],
    description: "Aluguel Ref. 03/2026",
    status: "PENDENTE",
    ...overrides,
  };
}

class FixedPayments extends ListPayments {
  constructor(private rows: PaymentItem[]) {
    const rental: Rental = {
      id: "rental-1",
      propertyId: "property-1",
      tenantId: "tenant-1",
      monthlyRent: 1_000,
      startDate: 1,
      dueDay: 10,
      parentRentalId: null,
      formalConsent: null,
      contractSigned: false,
      signaturesNotarized: false,
      initialPaymentsPaid: false,
      keysReleasedAt: null,
      createdAt: 1,
      updatedAt: 1,
    };
    const rentalRepository: IRentalRepository = {
      create: async (item) => item,
      findById: async () => null,
      findByPropertyId: async () => [],
      findAll: async () => [],
      updatePrerequisites: async (id, prerequisites) => ({ ...rental, id, ...prerequisites }),
      releaseKeys: async (id, releasedAt) => ({ ...rental, id, keysReleasedAt: releasedAt }),
    };
    const historyRepository: IPropertyHistoryRepository = {
      findByPropertyId: async () => ({ contracts: [], payments: [], inspections: [], maintenances: [] }),
      findContractById: async () => null,
      findAllContracts: async () => [],
      createContract: async (contract) => contract,
      createPayment: async (item) => item,
      createInspection: async (inspection) => inspection,
      createMaintenance: async (maintenance) => maintenance,
    };
    super(rentalRepository, historyRepository);
  }

  async execute(): Promise<PaymentItem[]> {
    return this.rows;
  }
}

describe("GetFinancialReport", () => {
  it("filters by period and reports administration fee only on rent portions", async () => {
    const receipt: PropertyPayment = {
      id: "receipt-1",
      propertyId: "property-1",
      contractId: "contract-1",
      amount: 620,
      amountCents: 62_000,
      rentAmountCents: 50_000,
      expensesAmountCents: 10_000,
      fineAmountCents: 1_000,
      interestAmountCents: 1_000,
      paidAt: Date.UTC(2026, 2, 15, 12),
      description: "Pagamento parcial",
      createdAt: Date.UTC(2026, 2, 15, 12),
    };
    const rows = [
      payment({
        id: "received-installment",
        receipts: [receipt],
        status: "PAGO",
      }),
      payment({
        id: "overdue-installment",
        dueDate: Date.UTC(2026, 2, 20, 23, 59, 59, 999),
        rentOutstandingCents: 20_000,
        expensesOutstandingCents: 5_000,
        fineOutstandingCents: 3_000,
        interestOutstandingCents: 1_000,
        totalAmount: 290,
        status: "ATRASADO",
      }),
      payment({
        id: "outside-period",
        receipts: [{
          ...receipt,
          id: "outside-receipt",
          paidAt: Date.UTC(2026, 1, 15, 12),
        }],
        dueDate: Date.UTC(2026, 1, 10, 23, 59, 59, 999),
        status: "PENDENTE",
      }),
    ];
    const property: Property = {
      id: "property-1",
      title: "Casa",
      address: "Rua das Flores",
      neighborhood: null,
      bedrooms: null,
      description: null,
      price: 1_000,
      ownerId: "owner-1",
      status: PropertyStatus.ALUGADO,
      createdAt: 1,
      updatedAt: 1,
    };
    const settings: GlobalFinancialSettings = {
      ...DEFAULT_FINANCIAL_LATE_RULES,
      adminFeeBasisPoints: 1_000,
      updatedAt: 1,
      updatedBy: null,
    };
    const financialRepository = {
      getGlobalSettings: async () => settings,
    } as IFinancialRepository;
    const owner: Contact = {
      id: "owner-1",
      name: "Proprietário",
      cpfCnpj: null,
      phone: null,
      email: null,
      createdAt: 1,
      updatedAt: 1,
    };
    const ownerRepository: IOwnerRepository = {
      create: async (contact) => contact,
      findById: async () => owner,
      findByCpfCnpj: async () => null,
      findAll: async () => [owner],
      update: async (contact) => contact,
      delete: async () => undefined,
    };
    const propertyRepository = {
      findAll: async () => [property],
    } as IPropertyRepository;

    const report = await new GetFinancialReport(
      new FixedPayments(rows),
      ownerRepository,
      propertyRepository,
      financialRepository,
    ).execute({
      ownerId: "ALL",
      propertyIds: ["property-1"],
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      includeStatuses: ["RECEBIDO", "EM_ATRASO", "A_VENCER"],
    });

    assert.equal(report.properties[0].entries.length, 2);
    assert.equal(report.properties[0].entries[0].adminFeeCents, 5_000);
    assert.equal(report.properties[0].entries[1].adminFeeCents, 2_000);
    assert.equal(report.totals.receivedCents, 62_000);
    assert.equal(report.totals.overdueCents, 29_000);
  });
});
