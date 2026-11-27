import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IFinancialRepository } from "../../domain/repositories/IFinancialRepository";
import { calcularEncargos, DEFAULT_FINANCIAL_LATE_RULES } from "../../domain/entities/FinancialCharges";
import { PropertyPayment } from "../../domain/entities/PropertyHistory";
import { InstallmentItem } from "../../domain/entities/FinancialSettings";

export interface PaymentItem {
  id: string;
  rentalId: string;
  contractId: string | null;
  propertyId: string;
  propertyTitle: string;
  ownerId: string | null;
  tenantId: string;
  tenantName: string;
  clientId: string;
  amount: number;
  amountCents: number;
  rentAmountCents: number;
  expensesAmountCents: number;
  receivedAmountCents: number;
  principalOutstandingCents: number;
  rentOutstandingCents: number;
  expensesOutstandingCents: number;
  fineOutstandingCents: number;
  interestOutstandingCents: number;
  totalAmount: number;
  fineAmount: number;
  interestAmount: number;
  daysOverdue: number;
  paidAt?: number | null;
  dueDate: number;
  referenceMonth: string;
  receiptPath?: string | null;
  receipts: PropertyPayment[];
  installmentItems: InstallmentItem[];
  description: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
}

interface ExpectedCharge {
  referenceMonth: string;
  dueDate: number;
  rentAmountCents: number;
  expensesAmountCents: number;
  installmentItems: InstallmentItem[];
}

interface ReceiptTotals {
  principalCents: number;
  rentCents: number;
  expensesCents: number;
  fineCents: number;
  interestCents: number;
  receivedCents: number;
}

const centsFromAmount = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) throw new Error("Foi encontrado um valor de pagamento inválido.");
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Valor de pagamento fora do limite permitido.");
  return cents;
};

const amountFromCents = (value: number): number => value / 100;
const dayNumber = (timestamp: number): number => {
  const date = new Date(timestamp);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
};

export class ListPayments {
  constructor(
    private rentalRepository: IRentalRepository,
    private historyRepository: IPropertyHistoryRepository,
    private clientRepository?: IClientRepository,
    private propertyRepository?: IPropertyRepository,
    private financialRepository?: IFinancialRepository,
  ) {}

  async execute(tenantIdFilter?: string, currentTimestamp = Date.now()): Promise<PaymentItem[]> {
    if (!Number.isFinite(currentTimestamp)) throw new Error("A data de referência financeira é inválida.");
    const rentals = await this.rentalRepository.findAll();
    const globalSettings = this.financialRepository
      ? await this.financialRepository.getGlobalSettings()
      : { ...DEFAULT_FINANCIAL_LATE_RULES };
    const results: PaymentItem[] = [];

    for (const rental of rentals.filter((item) => !tenantIdFilter || item.tenantId === tenantIdFilter)) {
      const history = await this.historyRepository.findByPropertyId(rental.propertyId);
      const contract = history.contracts.find((item) => item.rentalId === rental.id)
        ?? history.contracts.find((item) =>
          item.rentalId == null
          && item.propertyId === rental.propertyId
          && item.tenantId === rental.tenantId
          && item.status === "ACTIVE")
        ?? null;
      if (!contract) continue;

      const contractSettings = this.financialRepository
        ? await this.financialRepository.getContractSettings(contract.id)
        : null;
      const rules = contractSettings?.useOwnRules ? contractSettings : globalSettings;
      const items = this.financialRepository
        ? await this.financialRepository.listInstallmentItems(contract.id)
        : [];
      const itemsByReference = new Map<string, InstallmentItem[]>();
      for (const installmentItem of items) {
        const group = itemsByReference.get(installmentItem.referenceMonth) ?? [];
        group.push(installmentItem);
        itemsByReference.set(installmentItem.referenceMonth, group);
      }

      const activePayments = history.payments
        .filter((payment) => payment.contractId === contract.id && payment.reversedAt == null)
        .sort((a, b) => a.paidAt - b.paidAt || a.createdAt - b.createdAt);
      const expectedCharges = contract.status === "CANCELLED"
        ? []
        : this.calculateExpectedCharges(
          contract.startDate,
          contract.endDate ?? rental.endDate,
          rental.dueDay,
          contract.monthlyRent,
          currentTimestamp,
          itemsByReference,
        );
      const chargesByReference = new Map(
        expectedCharges.map((charge) => [charge.referenceMonth, charge] as const),
      );
      const receiptsByReference = new Map<string, PropertyPayment[]>();
      let legacyReceiptsCents = 0;
      for (const payment of activePayments) {
        const referenceMonth = this.resolveReferenceMonth(payment, chargesByReference);
        if (!referenceMonth) {
          if (!payment.referenceMonth && payment.dueDate == null) {
            legacyReceiptsCents += payment.amountCents ?? centsFromAmount(payment.amount);
          }
          continue;
        }
        const group = receiptsByReference.get(referenceMonth) ?? [];
        group.push(payment);
        receiptsByReference.set(referenceMonth, group);
      }

      const tenant = this.clientRepository ? await this.clientRepository.findById(contract.tenantId) : null;
      const property = this.propertyRepository ? await this.propertyRepository.findById(rental.propertyId) : null;

      for (const charge of expectedCharges) {
        const receipts = receiptsByReference.get(charge.referenceMonth) ?? [];
        const principalCents = charge.rentAmountCents + charge.expensesAmountCents;
        const receiptTotals = this.calculateReceiptTotals(receipts, principalCents, charge.rentAmountCents);
        const legacyRentAllocation = Math.min(
          legacyReceiptsCents,
          charge.rentAmountCents - receiptTotals.rentCents,
        );
        const legacyExpensesAllocation = Math.min(
          legacyReceiptsCents - legacyRentAllocation,
          charge.expensesAmountCents - receiptTotals.expensesCents,
        );
        const legacyAllocation = legacyRentAllocation + legacyExpensesAllocation;
        legacyReceiptsCents -= legacyAllocation;
        receiptTotals.rentCents += legacyRentAllocation;
        receiptTotals.expensesCents += legacyExpensesAllocation;
        receiptTotals.principalCents += legacyAllocation;
        receiptTotals.receivedCents += legacyAllocation;

        const principalOutstandingCents = Math.max(0, principalCents - receiptTotals.principalCents);
        const rentOutstandingCents = Math.max(0, charge.rentAmountCents - receiptTotals.rentCents);
        const expensesOutstandingCents = Math.max(0, charge.expensesAmountCents - receiptTotals.expensesCents);
        const chargesDue = calcularEncargos(
          { amountCents: principalOutstandingCents, dueDate: charge.dueDate },
          rules,
          currentTimestamp,
        );
        const fineOutstandingCents = Math.max(0, chargesDue.multa - receiptTotals.fineCents);
        const interestOutstandingCents = Math.max(0, chargesDue.juros - receiptTotals.interestCents);
        const totalOutstandingCents =
          principalOutstandingCents + fineOutstandingCents + interestOutstandingCents;
        const daysOverdue = Math.max(0, dayNumber(currentTimestamp) - dayNumber(charge.dueDate));
        const status = totalOutstandingCents === 0
          ? "PAGO"
          : daysOverdue > 0
            ? "ATRASADO"
            : "PENDENTE";
        const lastReceipt = receipts[receipts.length - 1];

        results.push({
          id: `installment-${rental.id}-${charge.referenceMonth.replace("/", "-")}`,
          rentalId: rental.id,
          contractId: contract.id,
          propertyId: rental.propertyId,
          propertyTitle: property?.title ?? "Imóvel",
          ownerId: property?.ownerId ?? null,
          tenantId: contract.tenantId,
          tenantName: tenant?.name ?? "Locatário",
          clientId: contract.tenantId,
          amount: amountFromCents(principalCents),
          amountCents: principalCents,
          rentAmountCents: charge.rentAmountCents,
          expensesAmountCents: charge.expensesAmountCents,
          receivedAmountCents: receiptTotals.receivedCents,
          principalOutstandingCents,
          rentOutstandingCents,
          expensesOutstandingCents,
          fineOutstandingCents,
          interestOutstandingCents,
          totalAmount: amountFromCents(totalOutstandingCents),
          fineAmount: amountFromCents(fineOutstandingCents),
          interestAmount: amountFromCents(interestOutstandingCents),
          daysOverdue,
          paidAt: lastReceipt?.paidAt ?? null,
          dueDate: charge.dueDate,
          referenceMonth: charge.referenceMonth,
          receiptPath: lastReceipt?.receiptPath ?? null,
          receipts,
          installmentItems: charge.installmentItems,
          description: `Aluguel Ref. ${charge.referenceMonth}`,
          status,
        });
      }
    }

    return results.sort((a, b) => b.dueDate - a.dueDate || a.tenantName.localeCompare(b.tenantName, "pt-BR"));
  }

  private calculateReceiptTotals(
    receipts: PropertyPayment[],
    principalDueCents: number,
    rentDueCents: number,
  ): ReceiptTotals {
    const totals: ReceiptTotals = {
      principalCents: 0,
      rentCents: 0,
      expensesCents: 0,
      fineCents: 0,
      interestCents: 0,
      receivedCents: 0,
    };
    for (const payment of receipts) {
      const amountCents = payment.amountCents ?? centsFromAmount(payment.amount);
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        throw new Error(`O recebimento ${payment.id} possui um valor inválido.`);
      }
      const hasAllocation = payment.principalAmountCents != null
        || payment.fineAmountCents != null
        || payment.interestAmountCents != null
        || payment.rentAmountCents != null
        || payment.expensesAmountCents != null;
      const principal = hasAllocation
        ? payment.principalAmountCents ?? 0
        : Math.min(amountCents, Math.max(0, principalDueCents - totals.principalCents));
      const rent = payment.rentAmountCents
        ?? (hasAllocation
          ? principal
          : Math.min(principal, Math.max(0, rentDueCents - totals.rentCents)));
      const expenses = payment.expensesAmountCents
        ?? (hasAllocation ? Math.max(0, principal - rent) : Math.max(0, principal - rent));
      const fine = hasAllocation ? payment.fineAmountCents ?? 0 : 0;
      const interest = hasAllocation ? payment.interestAmountCents ?? 0 : 0;
      if (
        ![principal, rent, expenses, fine, interest].every((value) => Number.isSafeInteger(value) && value >= 0)
        || rent + expenses !== principal
        || principal + fine + interest > amountCents
      ) {
        throw new Error(`O recebimento ${payment.id} possui uma alocação financeira inválida.`);
      }
      totals.principalCents += principal;
      totals.rentCents += rent;
      totals.expensesCents += expenses;
      totals.fineCents += fine;
      totals.interestCents += interest;
      totals.receivedCents += amountCents;
    }
    return totals;
  }

  private calculateExpectedCharges(
    startDateTimestamp: number,
    endDateTimestamp: number | null | undefined,
    dueDay: number,
    monthlyRent: number,
    currentTimestamp: number,
    itemsByReference: Map<string, InstallmentItem[]>,
  ): ExpectedCharge[] {
    const charges: ExpectedCharge[] = [];
    const start = new Date(startDateTimestamp);
    const current = new Date(currentTimestamp);
    let year = start.getUTCFullYear();
    let month = start.getUTCMonth();
    const throughCurrentMonth = Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0, 23, 59, 59, 999);

    while (charges.length <= 600) {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const actualDay = Math.min(dueDay, daysInMonth);
      const dueDate = Date.UTC(year, month, actualDay, 23, 59, 59, 999);
      if (dueDate < Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) {
        month++;
        if (month > 11) { month = 0; year++; }
        continue;
      }
      if (dueDate > throughCurrentMonth || (endDateTimestamp != null && dueDate > endDateTimestamp)) break;

      const referenceMonth = `${String(month + 1).padStart(2, "0")}/${year}`;
      charges.push({
        referenceMonth,
        dueDate,
        rentAmountCents: centsFromAmount(monthlyRent),
        expensesAmountCents: (itemsByReference.get(referenceMonth) ?? []).reduce(
          (sum, item) => sum + item.amountCents,
          0,
        ),
        installmentItems: itemsByReference.get(referenceMonth) ?? [],
      });
      month++;
      if (month > 11) { month = 0; year++; }
    }

    return charges;
  }

  private resolveReferenceMonth(
    payment: PropertyPayment,
    charges: Map<string, ExpectedCharge>,
  ): string | null {
    if (payment.referenceMonth && charges.has(payment.referenceMonth)) return payment.referenceMonth;
    if (payment.dueDate != null) {
      const dueReference = this.formatReferenceMonth(payment.dueDate);
      if (charges.has(dueReference)) return dueReference;
    }

    const description = payment.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const explicit = description.match(/\b(0?[1-9]|1[0-2])\/(20\d{2})\b/);
    if (explicit) {
      const reference = `${explicit[1].padStart(2, "0")}/${explicit[2]}`;
      if (charges.has(reference)) return reference;
    }

    const monthMatch = description.match(
      /\b(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\s*\/?\s*(20\d{2})\b/,
    );
    if (monthMatch) {
      const monthIndex = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
        .findIndex((prefix) => monthMatch[1].startsWith(prefix));
      const reference = `${String(monthIndex + 1).padStart(2, "0")}/${monthMatch[2]}`;
      if (monthIndex >= 0 && charges.has(reference)) return reference;
    }

    const paidMonth = this.formatReferenceMonth(payment.paidAt);
    return charges.has(paidMonth) ? paidMonth : null;
  }

  private formatReferenceMonth(timestamp: number): string {
    const date = new Date(timestamp);
    return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  }
}
