import { DEFAULT_FINANCIAL_LATE_RULES, FinancialLateRules, calcularEncargos } from "../../domain/entities/FinancialCharges";
import { DailyLateFeeCalculation } from "../../domain/entities/LateFee";

export interface CalculateDailyLateFeeDTO {
  originalAmount: number;
  dueDate: string | Date;
  calculationDate?: string | Date;
}

function dateOnly(value: string | Date, fieldName: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error(`${fieldName} is invalid`);
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} is required`);
  const input = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (match) {
    const [year, month, day] = match.slice(1).map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
      throw new Error(`${fieldName} is invalid`);
    }
    return input;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${fieldName} is invalid`);
  return parsed.toISOString().slice(0, 10);
}

export class CalculateDailyLateFee {
  execute(
    dto: CalculateDailyLateFeeDTO,
    rules: FinancialLateRules = DEFAULT_FINANCIAL_LATE_RULES,
  ): DailyLateFeeCalculation {
    if (dto.originalAmount === undefined || dto.originalAmount === null || !Number.isFinite(dto.originalAmount)) {
      throw new Error("Original amount is required and must be a valid number");
    }
    if (dto.originalAmount <= 0) throw new Error("Original amount must be greater than zero");

    const amountCents = Math.round(dto.originalAmount * 100);
    if (!Number.isSafeInteger(amountCents)) throw new Error("Original amount is outside the supported range");
    const dueDate = dateOnly(dto.dueDate, "Due date");
    const calculationDate = dateOnly(dto.calculationDate ?? new Date(), "Calculation date");
    const charges = calcularEncargos({ amountCents, dueDate }, rules, calculationDate);
    const dailyInterestRatePercentage = rules.monthlyInterestBasisPoints / 100 / 30;

    return {
      originalAmount: amountCents / 100,
      dueDate,
      calculationDate,
      daysOverdue: charges.diasAtraso,
      finePercentage: rules.fineRateBasisPoints / 100,
      fineAmount: charges.multa / 100,
      dailyInterestRatePercentage,
      monthlyInterestRatePercentage: rules.monthlyInterestBasisPoints / 100,
      interestAmount: charges.juros / 100,
      totalLateFee: (charges.multa + charges.juros) / 100,
      totalAmountDue: charges.total / 100,
    };
  }
}
