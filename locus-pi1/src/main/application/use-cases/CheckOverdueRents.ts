import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import {
  OverdueCheckResult,
  OverdueDebtItem,
  OverdueSummary,
  calculateOverdueCharges,
} from "../../domain/entities/OverdueRent";

export interface CheckOverdueRentsOptions {
  rentalId?: string;
  tenantId?: string;
  currentTimestamp?: number;
}

export class CheckOverdueRents {
  constructor(
    private rentalRepository: IRentalRepository,
    private historyRepository: IPropertyHistoryRepository,
    private clientRepository?: IClientRepository,
    private propertyRepository?: IPropertyRepository
  ) {}

  async execute(options?: CheckOverdueRentsOptions): Promise<OverdueCheckResult> {
    const currentTimestamp = options?.currentTimestamp ?? Date.now();

    // Buscar aluguéis para verificar
    let rentalsToCheck = await this.rentalRepository.findAll();

    // Filtrar aluguéis válidos (não encerrados antes do início)
    rentalsToCheck = rentalsToCheck.filter(
      (r) => !r.endDate || r.endDate >= r.startDate
    );

    if (options?.rentalId) {
      rentalsToCheck = rentalsToCheck.filter((r) => r.id === options.rentalId);
    }

    if (options?.tenantId) {
      rentalsToCheck = rentalsToCheck.filter((r) => r.tenantId === options.tenantId);
    }

    const debts: OverdueDebtItem[] = [];
    const overdueRentalIds = new Set<string>();

    for (const rental of rentalsToCheck) {
      const history = await this.historyRepository.findByPropertyId(rental.propertyId);
      const contract = history.contracts.find((c) => c.rentalId === rental.id) ?? null;
      const contractId = contract ? contract.id : null;

      // Filtrar pagamentos deste contrato/aluguel
      const contractPayments = history.payments.filter((p) =>
        contractId ? p.contractId === contractId : p.propertyId === rental.propertyId
      );

      const totalPaid = contractPayments.reduce((acc, p) => acc + p.amount, 0);

      // Calcular todas as parcelas devidas até o momento atual
      const expectedCharges = this.calculateExpectedCharges(
        rental.startDate,
        rental.dueDay,
        rental.monthlyRent,
        currentTimestamp
      );

      // Alocar pagamentos cronologicamente (FIFO)
      const pendingCharges = this.calculatePendingDebts(expectedCharges, totalPaid);

      // Apenas parcelas cujo vencimento já ocorreu em relação ao currentTimestamp
      const overdueCharges = pendingCharges.filter((c) => c.dueDate < currentTimestamp);

      if (overdueCharges.length > 0) {
        overdueRentalIds.add(rental.id);

        let tenantName: string | null = null;
        let tenantEmail: string | null = null;
        let tenantPhone: string | null = null;
        if (this.clientRepository) {
          const tenant = await this.clientRepository.findById(rental.tenantId);
          if (tenant) {
            tenantName = tenant.name;
            tenantEmail = tenant.email ?? null;
            tenantPhone = tenant.phone ?? null;
          }
        }

        let propertyTitle: string | null = null;
        if (this.propertyRepository) {
          const property = await this.propertyRepository.findById(rental.propertyId);
          if (property) {
            propertyTitle = property.title;
          }
        }

        for (const charge of overdueCharges) {
          // RN06: cálculo de juros (1% ao mês pro rata die) e multa (2% por dia)
          const charges = calculateOverdueCharges(
            charge.amount,
            charge.dueDate,
            currentTimestamp
          );

          debts.push({
            rentalId: rental.id,
            contractId,
            propertyId: rental.propertyId,
            propertyTitle,
            tenantId: rental.tenantId,
            tenantName,
            tenantEmail,
            tenantPhone,
            referenceMonth: charge.referenceMonth,
            dueDate: charge.dueDate,
            daysOverdue: charges.daysOverdue,
            originalAmount: charge.amount,
            interestAmount: charges.interestAmount,
            fineAmount: charges.fineAmount,
            totalAmount: charges.totalAmount,
            isOverTwoMonths: charges.isOverTwoMonths,
            autoSettlementBlocked: charges.isOverTwoMonths, // RN05
          });
        }
      }
    }

    // Ordenar do atraso mais antigo ao mais recente
    debts.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const summary: OverdueSummary = {
      totalOverdueContracts: overdueRentalIds.size,
      totalDebtsCount: debts.length,
      totalOriginalAmount: Math.round(debts.reduce((acc, d) => acc + d.originalAmount, 0) * 100) / 100,
      totalInterestAmount: Math.round(debts.reduce((acc, d) => acc + d.interestAmount, 0) * 100) / 100,
      totalFineAmount: Math.round(debts.reduce((acc, d) => acc + d.fineAmount, 0) * 100) / 100,
      totalDueAmount: Math.round(debts.reduce((acc, d) => acc + d.totalAmount, 0) * 100) / 100,
      totalCriticalDebts: debts.filter((d) => d.isOverTwoMonths).length,
    };

    return {
      summary,
      debts,
      checkedAt: currentTimestamp,
    };
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
        const unpaidForThisMonth = charge.amount - remainingPaid;
        remainingPaid = 0;
        pending.push({
          referenceMonth: charge.referenceMonth,
          dueDate: charge.dueDate,
          amount: Math.round(unpaidForThisMonth * 100) / 100,
        });
      }
    }

    return pending;
  }
}
