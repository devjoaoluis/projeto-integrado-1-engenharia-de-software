import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IFinancialRepository } from "../../domain/repositories/IFinancialRepository";
import {
  OverdueCheckResult,
  OverdueDebtItem,
  OverdueSummary,
} from "../../domain/entities/OverdueRent";
import { ListPayments } from "./ListPayments";

export interface CheckOverdueRentsOptions {
  rentalId?: string;
  tenantId?: string;
  currentTimestamp?: number;
}

export class CheckOverdueRents {
  private readonly listPayments: ListPayments;

  constructor(
    private rentalRepository: IRentalRepository,
    private historyRepository: IPropertyHistoryRepository,
    private clientRepository?: IClientRepository,
    private propertyRepository?: IPropertyRepository,
    financialRepository?: IFinancialRepository,
  ) {
    this.listPayments = new ListPayments(
      rentalRepository,
      historyRepository,
      clientRepository,
      propertyRepository,
      financialRepository,
    );
  }

  async execute(options?: CheckOverdueRentsOptions): Promise<OverdueCheckResult> {
    const currentTimestamp = options?.currentTimestamp ?? Date.now();
    const rentals = (await this.rentalRepository.findAll())
      .filter((rental) => !rental.endDate || rental.endDate >= rental.startDate)
      .filter((rental) => !options?.rentalId || rental.id === options.rentalId)
      .filter((rental) => !options?.tenantId || rental.tenantId === options.tenantId);
    const paymentItems = await this.listPayments.execute(options?.tenantId, currentTimestamp);
    const debts: OverdueDebtItem[] = [];
    const overdueRentalIds = new Set<string>();

    for (const rental of rentals) {
      const property = this.propertyRepository
        ? await this.propertyRepository.findById(rental.propertyId)
        : null;
      const tenant = this.clientRepository
        ? await this.clientRepository.findById(rental.tenantId)
        : null;
      const overduePayments = paymentItems.filter(
        (payment) => payment.rentalId === rental.id && payment.status === "ATRASADO",
      );

      if (overduePayments.length === 0) continue;
      overdueRentalIds.add(rental.id);

      for (const payment of overduePayments) {
        debts.push({
          rentalId: rental.id,
          contractId: payment.contractId,
          propertyId: rental.propertyId,
          propertyTitle: property?.title ?? null,
          tenantId: rental.tenantId,
          tenantName: tenant?.name ?? null,
          tenantEmail: tenant?.email ?? null,
          tenantPhone: tenant?.phone ?? null,
          referenceMonth: payment.referenceMonth,
          dueDate: payment.dueDate,
          daysOverdue: payment.daysOverdue,
          originalAmount: payment.amount,
          interestAmount: payment.interestAmount,
          fineAmount: payment.fineAmount,
          totalAmount: payment.totalAmount,
          isOverTwoMonths: payment.daysOverdue > 60,
          autoSettlementBlocked: payment.daysOverdue > 60,
        });
      }
    }

    debts.sort((a, b) => b.daysOverdue - a.daysOverdue);
    const summary: OverdueSummary = {
      totalOverdueContracts: overdueRentalIds.size,
      totalDebtsCount: debts.length,
      totalOriginalAmount: Math.round(debts.reduce((sum, debt) => sum + debt.originalAmount, 0) * 100) / 100,
      totalInterestAmount: Math.round(debts.reduce((sum, debt) => sum + debt.interestAmount, 0) * 100) / 100,
      totalFineAmount: Math.round(debts.reduce((sum, debt) => sum + debt.fineAmount, 0) * 100) / 100,
      totalDueAmount: Math.round(debts.reduce((sum, debt) => sum + debt.totalAmount, 0) * 100) / 100,
      totalCriticalDebts: debts.filter((debt) => debt.isOverTwoMonths).length,
    };

    return { summary, debts, checkedAt: currentTimestamp };
  }
}
