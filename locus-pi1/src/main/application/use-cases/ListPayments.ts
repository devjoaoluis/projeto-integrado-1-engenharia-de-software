import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export interface PaymentItem {
  id: string;
  rentalId: string;
  contractId: string | null;
  propertyId: string;
  tenantId: string;
  clientId: string;
  amount: number;
  paidAt?: number | null;
  dueDate: number;
  referenceMonth?: string | null;
  description: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
}

/**
 * Caso de uso: Listar pagamentos e débitos pendentes vinculados a locações e clientes.
 * Usado na aba de pagamentos e no modal de rescisão (HU-14).
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

    const filteredRentals = tenantIdFilter
      ? rentals.filter((r) => r.tenantId === tenantIdFilter)
      : rentals;

    for (const rental of filteredRentals) {
      const history = await this.historyRepository.findByPropertyId(rental.propertyId);
      const contract = history.contracts.find((c) => c.rentalId === rental.id) ?? null;
      const contractId = contract ? contract.id : null;

      // 1. Pagamentos efetuados
      const contractPayments = history.payments.filter((p) =>
        contractId ? p.contractId === contractId : p.propertyId === rental.propertyId
      );

      for (const p of contractPayments) {
        results.push({
          id: p.id,
          rentalId: rental.id,
          contractId,
          propertyId: rental.propertyId,
          tenantId: rental.tenantId,
          clientId: rental.tenantId,
          amount: p.amount,
          paidAt: p.paidAt,
          dueDate: p.paidAt,
          description: p.description,
          status: "PAGO",
        });
      }

      // 2. Cobranças devidas vs pagas para calcular débitos pendentes/em atraso
      const totalPaid = contractPayments.reduce((acc, p) => acc + p.amount, 0);
      const expectedCharges = this.calculateExpectedCharges(
        rental.startDate,
        rental.dueDay,
        rental.monthlyRent,
        currentTimestamp
      );

      const pendingDebts = this.calculatePendingDebts(expectedCharges, totalPaid);

      for (const debt of pendingDebts) {
        const isOverdue = debt.dueDate < currentTimestamp;
        results.push({
          id: `debt-${rental.id}-${debt.referenceMonth.replace("/", "-")}`,
          rentalId: rental.id,
          contractId,
          propertyId: rental.propertyId,
          tenantId: rental.tenantId,
          clientId: rental.tenantId,
          amount: debt.amount,
          dueDate: debt.dueDate,
          referenceMonth: debt.referenceMonth,
          description: `Aluguel Ref. ${debt.referenceMonth}`,
          status: isOverdue ? "ATRASADO" : "PENDENTE",
        });
      }
    }

    return results;
  }

  private calculateExpectedCharges(
    startDateTimestamp: number,
    dueDay: number,
    monthlyRent: number,
    currentTimestamp: number
  ): Array<{ referenceMonth: string; dueDate: number; amount: number }> {
    const charges: Array<{ referenceMonth: string; dueDate: number; amount: number }> = [];
    const start = new Date(startDateTimestamp);
    let currentYear = start.getUTCFullYear();
    let currentMonth = start.getUTCMonth();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const actualDay = Math.min(dueDay, daysInMonth);
      const dueDate = new Date(Date.UTC(currentYear, currentMonth, actualDay, 23, 59, 59, 999));
      const dueTimestamp = dueDate.getTime();

      if (dueTimestamp < startDateTimestamp) {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        continue;
      }

      if (dueTimestamp > currentTimestamp) {
        break;
      }

      const monthStr = String(currentMonth + 1).padStart(2, "0");
      charges.push({
        referenceMonth: `${monthStr}/${currentYear}`,
        dueDate: dueTimestamp,
        amount: monthlyRent,
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }

      if (charges.length > 600) break;
    }

    return charges;
  }

  private calculatePendingDebts(
    expectedCharges: Array<{ referenceMonth: string; dueDate: number; amount: number }>,
    totalPaid: number
  ): Array<{ referenceMonth: string; dueDate: number; amount: number }> {
    let remainingPaid = totalPaid;
    const pending: Array<{ referenceMonth: string; dueDate: number; amount: number }> = [];

    for (const charge of expectedCharges) {
      if (remainingPaid >= charge.amount) {
        remainingPaid -= charge.amount;
      } else {
        const unpaid = charge.amount - remainingPaid;
        remainingPaid = 0;
        pending.push({
          referenceMonth: charge.referenceMonth,
          dueDate: charge.dueDate,
          amount: Math.round(unpaid * 100) / 100,
        });
      }
    }

    return pending;
  }
}
