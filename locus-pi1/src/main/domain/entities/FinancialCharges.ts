const MILLISECONDS_PER_DAY = 86_400_000;
const BASIS_POINTS = 10_000n;
const DAYS_IN_MONTH = 30n;

export interface FinancialInstallment {
  amountCents: number;
  dueDate: string | number | Date;
}

export interface FinancialLateRules {
  graceDays: number;
  fineRateBasisPoints: number;
  monthlyInterestBasisPoints: number;
}

export interface FinancialCharges {
  diasAtraso: number;
  multa: number;
  juros: number;
  total: number;
}

export const DEFAULT_FINANCIAL_LATE_RULES: FinancialLateRules = {
  graceDays: 3,
  fineRateBasisPoints: 1_000,
  monthlyInterestBasisPoints: 100,
};

function dayNumber(value: string | number | Date): number {
  let year: number;
  let month: number;
  let day: number;

  if (typeof value === "string") {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      year = Number(dateOnly[1]);
      month = Number(dateOnly[2]);
      day = Number(dateOnly[3]);
    } else {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new Error("Data financeira inválida.");
      year = parsed.getUTCFullYear();
      month = parsed.getUTCMonth() + 1;
      day = parsed.getUTCDate();
    }
  } else {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error("Data financeira inválida.");
    year = parsed.getUTCFullYear();
    month = parsed.getUTCMonth() + 1;
    day = parsed.getUTCDate();
  }

  const normalized = new Date(0);
  normalized.setUTCFullYear(year, month - 1, day);
  normalized.setUTCHours(0, 0, 0, 0);
  const timestamp = normalized.getTime();
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error("Data financeira inválida.");
  }
  return Math.floor(timestamp / MILLISECONDS_PER_DAY);
}

function roundHalfUp(numerator: bigint, denominator: bigint): number {
  const rounded = (numerator + denominator / 2n) / denominator;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) throw new Error("Valor financeiro fora do limite permitido.");
  return result;
}

/**
 * All monetary results are integer cents. Percentage fractions round half-up once,
 * at the final cent, using a 30-day month for pro-rata interest.
 */
export function calcularEncargos(
  lancamento: FinancialInstallment,
  regras: FinancialLateRules,
  dataReferencia: string | number | Date,
): FinancialCharges {
  if (!Number.isSafeInteger(lancamento.amountCents) || lancamento.amountCents < 0) {
    throw new Error("O valor do lançamento deve ser um inteiro em centavos não negativo.");
  }
  if (!Number.isSafeInteger(regras.graceDays) || regras.graceDays < 0) {
    throw new Error("A carência deve ser um número inteiro de dias não negativo.");
  }
  if (
    !Number.isSafeInteger(regras.fineRateBasisPoints) ||
    regras.fineRateBasisPoints < 0 ||
    !Number.isSafeInteger(regras.monthlyInterestBasisPoints) ||
    regras.monthlyInterestBasisPoints < 0
  ) {
    throw new Error("As taxas financeiras devem ser inteiros não negativos em pontos-base.");
  }

  const diasAtraso = Math.max(0, dayNumber(dataReferencia) - dayNumber(lancamento.dueDate));
  const diasComEncargos = Math.max(0, diasAtraso - regras.graceDays);
  const principal = BigInt(lancamento.amountCents);
  const multa =
    diasComEncargos > 0
      ? roundHalfUp(principal * BigInt(regras.fineRateBasisPoints), BASIS_POINTS)
      : 0;
  const juros =
    diasComEncargos > 0
      ? roundHalfUp(
          principal * BigInt(regras.monthlyInterestBasisPoints) * BigInt(diasComEncargos),
          BASIS_POINTS * DAYS_IN_MONTH,
        )
      : 0;
  const total = lancamento.amountCents + multa + juros;
  if (!Number.isSafeInteger(total)) throw new Error("Valor financeiro fora do limite permitido.");

  return {
    diasAtraso,
    multa,
    juros,
    total,
  };
}
