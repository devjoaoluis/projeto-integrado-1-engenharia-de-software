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

    // 2. Regra de Negócio RN05:
    // Bloquear baixa automática para débitos com mais de 2 meses de atraso (>60 dias), mantendo-os pendentes.
    const isAutomatic = input.automatic === true;
    if (isAutomatic && targetDebt.isOverTwoMonths) {
      throw new Error(
        "RN05: Baixa automática bloqueada para débitos com mais de 2 meses de atraso. O débito permanece pendente."
      );
    }

    // 3. Montar e persistir o registro financeiro de pagamento no histórico do imóvel
    const finalAmount = input.amount !== undefined ? input.amount : targetDebt.totalAmount;

    const payment: PropertyPayment = {
      id: crypto.randomUUID(),
      propertyId: targetDebt.propertyId,
      contractId: targetDebt.contractId || "",
      amount: finalAmount,
      paidAt,
      description:
        input.description ||
        `Quitação de aluguel (${targetDebt.referenceMonth}) com encargos moratórios (RN06) - ${isAutomatic ? "Baixa Automática" : "Baixa Manual"}`,
      createdAt: Date.now(),
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

