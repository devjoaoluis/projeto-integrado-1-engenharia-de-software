import crypto from "node:crypto";
import { CheckOverdueRents } from "./CheckOverdueRents";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { PropertyPayment } from "../../domain/entities/PropertyHistory";
import { OverdueDebtItem } from "../../domain/entities/OverdueRent";

export interface SettleOverdueDebtInput {
  rentalId: string;
  referenceMonth: string;
  amount?: number;
  automatic?: boolean;
  paidAt?: number;
  description?: string;
}

export interface SettleOverdueDebtResult {
  success: boolean;
  payment: PropertyPayment;
  settledDebt: OverdueDebtItem;
  message: string;
}

export class SettleOverdueDebt {
  constructor(
    private checkOverdueRents: CheckOverdueRents,
    private historyRepository: IPropertyHistoryRepository
  ) {}

  async execute(input: SettleOverdueDebtInput): Promise<SettleOverdueDebtResult> {
    if (!input.rentalId || !input.rentalId.trim()) {
      throw new Error("O ID da locação (rentalId) é obrigatório.");
    }
    if (!input.referenceMonth || !input.referenceMonth.trim()) {
      throw new Error("O mês de referência (referenceMonth) é obrigatório.");
    }
    if (input.automatic === true) {
      throw new Error("A baixa de parcelas deve ser realizada manualmente pela usuária.");
    }

    const paidAt = input.paidAt ?? Date.now();

    // 1. Obter débitos em aberto para a locação na data de pagamento
    const checkResult = await this.checkOverdueRents.execute({
      rentalId: input.rentalId,
      currentTimestamp: paidAt,
    });

    const targetDebt = checkResult.debts.find(
      (d) => d.referenceMonth === input.referenceMonth
    );

    if (!targetDebt) {
      throw new Error(
        `Não há débito pendente para a competência ${input.referenceMonth} nesta locação.`
      );
    }

    const finalAmount = targetDebt.totalAmount;
    if (input.amount !== undefined && Math.abs(input.amount - finalAmount) > 0.01) {
      throw new Error("O valor da baixa deve corresponder ao total atualizado do débito.");
    }

    const payment: PropertyPayment = {
      id: crypto.randomUUID(),
      propertyId: targetDebt.propertyId,
      contractId: targetDebt.contractId || "",
      amount: finalAmount,
      paidAt,
      description: input.description || `Baixa manual de aluguel - ${targetDebt.referenceMonth}`,
      createdAt: Date.now(),
      referenceMonth: targetDebt.referenceMonth,
      dueDate: targetDebt.dueDate,
      receiptPath: null,
    };

    const savedPayment = await this.historyRepository.createPayment(payment);

    return {
      success: true,
      payment: savedPayment,
      settledDebt: targetDebt,
      message: `Débito da competência ${targetDebt.referenceMonth} quitado com sucesso no valor de ${finalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    };
  }
}

