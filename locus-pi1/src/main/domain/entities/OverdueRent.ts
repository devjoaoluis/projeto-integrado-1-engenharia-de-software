/**
 * Entidade de Domínio: Notificação de Atraso e Débitos Vencidos (HU-10 / RF08)
 * Regras de negócio associadas:
 * - RN05: Bloquear a baixa automática para débitos com mais de 2 meses de atraso, mantendo-os pendentes.
 * - RN06: Cálculo automático de mora diária (1% ao mês pro rata die + 2% de multa por dia de atraso).
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
  interestAmount: number; // juros de mora (1% ao mês pro rata die)
  fineAmount: number;     // multa (2% por dia de atraso)
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

/**
 * Utilitário de cálculo de acréscimos moratórios em conformidade estrita com a RN06:
 * - 1% ao mês de juros de mora pro rata die: (0.01 / 30) * diasAtraso * valorBase
 * - 2% de multa por dia de atraso: 0.02 * diasAtraso * valorBase
 * - Identificação de mais de 2 meses de atraso (diasAtraso > 60) para aplicação da RN05
 */
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
  if (currentTimestamp <= dueDateTimestamp) {
    return {
      daysOverdue: 0,
      interestAmount: 0,
      fineAmount: 0,
      totalAmount: Math.round(originalAmount * 100) / 100,
      isOverTwoMonths: false,
    };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(1, Math.floor((currentTimestamp - dueDateTimestamp) / msPerDay));

  // RN06: 1% ao mês (base 30 dias pro rata) + 2% de multa por dia de atraso
  const interestRate = (0.01 / 30) * daysOverdue;
  const fineRate = 0.02 * daysOverdue;

  const interestAmount = Math.round(originalAmount * interestRate * 100) / 100;
  const fineAmount = Math.round(originalAmount * fineRate * 100) / 100;
  const totalAmount = Math.round((originalAmount + interestAmount + fineAmount) * 100) / 100;

  // RN05: mais de 2 meses de atraso (considerando 60 dias)
  const isOverTwoMonths = daysOverdue > 60;

  return {
    daysOverdue,
    interestAmount,
    fineAmount,
    totalAmount,
    isOverTwoMonths,
  };
}

