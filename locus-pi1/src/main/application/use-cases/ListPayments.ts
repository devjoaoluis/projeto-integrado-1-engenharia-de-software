import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { calculateOverdueCharges } from "../../domain/entities/OverdueRent";
import { PropertyPayment } from "../../domain/entities/PropertyHistory";

export interface PaymentItem {
  id: string;
  rentalId: string;
  contractId: string | null;
  propertyId: string;
  propertyTitle: string;
  tenantId: string;
  tenantName: string;
  clientId: string;
  amount: number;
  totalAmount: number;
  fineAmount: number;
  interestAmount: number;
  daysOverdue: number;
  paidAt?: number | null;
  dueDate: number;
  referenceMonth: string;
  receiptPath?: string | null;
  description: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
}

interface ExpectedCharge {
  referenceMonth: string;
  dueDate: number;
  amount: number;
}

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

/**
 * Lists manually recorded rent payments and the monthly installments due under each rental.
 */
export class ListPayments {
  constructor(
    private rentalRepository: IRentalRepository,
    private historyRepository: IPropertyHistoryRepository,
    private clientRepository?: IClientRepository,
    private propertyRepository?: IPropertyRepository,
  ) {}

  async execute(tenantIdFilter?: string, currentTimestamp = Date.now()): Promise<PaymentItem[]> {
    const rentals = await this.rentalRepository.findAll();
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
      const contractId = contract.id;
      const contractPayments = history.payments
        .filter((payment) => payment.contractId === contractId)
        .sort((a, b) => a.paidAt - b.paidAt);
      const tenant = this.clientRepository ? await this.clientRepository.findById(contract.tenantId) : null;
      const property = this.propertyRepository ? await this.propertyRepository.findById(rental.propertyId) : null;
      const expectedCharges = contract.status === "CANCELLED"
        ? []
        : this.calculateExpectedCharges(
          contract.startDate,
          contract.endDate ?? rental.endDate,
          rental.dueDay,
          contract.monthlyRent,
          currentTimestamp,
        );
      const chargesByReference = new Map(
        expectedCharges.map((charge) => [charge.referenceMonth, charge] as const),
      );
      const allocatedPayments = this.allocatePayments(expectedCharges, contractPayments);

      for (const payment of contractPayments) {
        const referenceMonth = this.resolveReferenceMonth(payment, chargesByReference);
        const charge = referenceMonth ? chargesByReference.get(referenceMonth) : undefined;
        results.push({
          id: payment.id,
          rentalId: rental.id,
          contractId,
          propertyId: rental.propertyId,
          propertyTitle: property?.title ?? "Imóvel",
          tenantId: contract.tenantId,
          tenantName: tenant?.name ?? "Locatário",
          clientId: contract.tenantId,
          amount: payment.amount,
          totalAmount: payment.amount,
          fineAmount: 0,
          interestAmount: 0,
          daysOverdue: 0,
          paidAt: payment.paidAt,
          dueDate: payment.dueDate ?? charge?.dueDate ?? payment.paidAt,
          referenceMonth: referenceMonth ?? this.formatReferenceMonth(payment.paidAt),
          receiptPath: payment.receiptPath,
          description: payment.description,
          status: "PAGO",
        });
      }

      for (const charge of expectedCharges) {
        const unpaidAmount = allocatedPayments.get(charge.referenceMonth) ?? 0;
        if (unpaidAmount <= 0) continue;

        const lateCharges = calculateOverdueCharges(charge.amount, charge.dueDate, currentTimestamp);
        const isOverdue = charge.dueDate < currentTimestamp;
        results.push({
          id: `debt-${rental.id}-${charge.referenceMonth.replace("/", "-")}`,
          rentalId: rental.id,
          contractId,
          propertyId: rental.propertyId,
          propertyTitle: property?.title ?? "Imóvel",
          tenantId: contract.tenantId,
          tenantName: tenant?.name ?? "Locatário",
          clientId: contract.tenantId,
          amount: unpaidAmount,
          totalAmount: roundCurrency(unpaidAmount + lateCharges.interestAmount + lateCharges.fineAmount),
          fineAmount: lateCharges.fineAmount,
          interestAmount: lateCharges.interestAmount,
          daysOverdue: lateCharges.daysOverdue,
          dueDate: charge.dueDate,
          referenceMonth: charge.referenceMonth,
          description: `Aluguel Ref. ${charge.referenceMonth}`,
          status: isOverdue ? "ATRASADO" : "PENDENTE",
        });
      }
    }

    return results.sort((a, b) => b.dueDate - a.dueDate);
  }

  private calculateExpectedCharges(
    startDateTimestamp: number,
    endDateTimestamp: number | null | undefined,
    dueDay: number,
    monthlyRent: number,
    currentTimestamp: number,
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
      if (dueDate < startDateTimestamp) {
        month++;
        if (month > 11) { month = 0; year++; }
        continue;
      }
      if (dueDate > throughCurrentMonth || (endDateTimestamp != null && dueDate > endDateTimestamp)) break;

      charges.push({
        referenceMonth: `${String(month + 1).padStart(2, "0")}/${year}`,
        dueDate,
        amount: monthlyRent,
      });
      month++;
      if (month > 11) { month = 0; year++; }
    }

    return charges;
  }

  private allocatePayments(
    charges: ExpectedCharge[],
    payments: PropertyPayment[],
  ): Map<string, number> {
    const unpaidByReference = new Map(
      charges.map((charge) => [charge.referenceMonth, charge.amount] as const),
    );
    let legacyPaid = 0;

    for (const payment of payments) {
      const referenceMonth = this.resolveReferenceMonth(
        payment,
        new Map(charges.map((charge) => [charge.referenceMonth, charge] as const)),
      );
      if (!referenceMonth) {
        if (payment.referenceMonth || payment.dueDate != null) continue;
        legacyPaid += payment.amount;
        continue;
      }
      const outstanding = unpaidByReference.get(referenceMonth);
      if (outstanding !== undefined) {
        unpaidByReference.set(referenceMonth, Math.max(0, roundCurrency(outstanding - payment.amount)));
      }
    }

    for (const charge of charges) {
      const outstanding = unpaidByReference.get(charge.referenceMonth) ?? 0;
      const allocated = Math.min(outstanding, legacyPaid);
      unpaidByReference.set(charge.referenceMonth, roundCurrency(outstanding - allocated));
      legacyPaid = roundCurrency(legacyPaid - allocated);
    }

    return unpaidByReference;
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
