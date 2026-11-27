import { DEFAULT_FINANCIAL_LATE_RULES, calcularEncargos } from "./FinancialCharges";

/**
 * Entidade de Domínio: Notificação de Atraso e Débitos Vencidos (HU-10 / RF08)
 * Regras de negócio associadas:
 * - RN05: Bloquear a baixa automática para débitos com mais de 2 meses de atraso, mantendo-os pendentes.
 * - Encargos calculados pelas regras financeiras configuradas.
 * - RNF01: Garantir integridade absoluta e confiabilidade dos status financeiros.
 */

export interface OverdueDebtItem {
  rentalId: string;
  contractId: string | null;
  propertyId: string;
  propertyTitle: string | null;
  tenantId: string;
  tenantName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  referenceMonth: string; // Ex: "09/2026"
  dueDate: number;        // timestamp da data de vencimento
  daysOverdue: number;    // dias corridos após o vencimento
  originalAmount: number; // valor original da parcela
  interestAmount: number;
  fineAmount: number;
  totalAmount: number;    // originalAmount + interestAmount + fineAmount
  isOverTwoMonths: boolean; // true se daysOverdue > 60
  autoSettlementBlocked: boolean; // RN05: true se isOverTwoMonths
}

export interface OverdueSummary {
  totalOverdueContracts: number;
  totalDebtsCount: number;
  totalOriginalAmount: number;
  totalInterestAmount: number;
  totalFineAmount: number;
  totalDueAmount: number;
  totalCriticalDebts: number; // Débitos com mais de 2 meses de atraso
}

export interface OverdueCheckResult {
  summary: OverdueSummary;
  debts: OverdueDebtItem[];
  checkedAt: number;
}

export interface OverdueNotification {
  id: string;
  rentalId: string;
  contractId: string | null;
  tenantId: string;
  referenceMonth: string;
  dueDate: number;
  daysOverdue: number;
  originalAmount: number;
  interestAmount: number;
  fineAmount: number;
  totalAmount: number;
  message: string;
  channel: "SYSTEM" | "EMAIL" | "WHATSAPP";
  createdAt: number;
}

export function calculateOverdueCharges(
  originalAmount: number,
  dueDateTimestamp: number,
  currentTimestamp: number = Date.now()
): {
  daysOverdue: number;
  interestAmount: number;
  fineAmount: number;
  totalAmount: number;
  isOverTwoMonths: boolean;
} {
  if (!Number.isFinite(originalAmount) || originalAmount < 0) {
    throw new Error("O valor do aluguel deve ser um número não negativo.");
  }
  const amountCents = Math.round(originalAmount * 100);
  if (!Number.isSafeInteger(amountCents)) throw new Error("Valor do aluguel fora do limite permitido.");
  const charges = calcularEncargos(
    { amountCents, dueDate: dueDateTimestamp },
    DEFAULT_FINANCIAL_LATE_RULES,
    currentTimestamp,
  );
  const daysOverdue = charges.diasAtraso;
  const isOverTwoMonths = daysOverdue > 60;
  return {
    daysOverdue,
    interestAmount: charges.juros / 100,
    fineAmount: charges.multa / 100,
    totalAmount: charges.total / 100,
    isOverTwoMonths,
  };
}

