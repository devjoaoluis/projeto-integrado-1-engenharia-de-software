import { DailyLateFeeCalculation } from "../../domain/entities/LateFee";

export interface CalculateDailyLateFeeDTO {
  originalAmount: number;
  dueDate: string | Date;
  calculationDate?: string | Date;
}

export class CalculateDailyLateFee {
  private static readonly MONTHLY_INTEREST_RATE = 0.01; // 1% ao mês
  private static readonly DAYS_IN_MONTH = 30; // Convenção padrão de conversão diária
  private static readonly FINE_RATE = 0.02; // Multa fixa de 2%

  public execute(dto: CalculateDailyLateFeeDTO): DailyLateFeeCalculation {
    if (dto.originalAmount === undefined || dto.originalAmount === null || isNaN(dto.originalAmount)) {
      throw new Error("Original amount is required and must be a valid number");
    }

    if (dto.originalAmount <= 0) {
      throw new Error("Original amount must be greater than zero");
    }

    const due = this.parseDate(dto.dueDate, "Due date");
    const calc = dto.calculationDate ? this.parseDate(dto.calculationDate, "Calculation date") : this.normalizeToMidnight(new Date());

    const diffMs = calc.getTime() - due.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const dueDateIso = this.formatDateIso(due);
    const calcDateIso = this.formatDateIso(calc);

    const dailyInterestRate = CalculateDailyLateFee.MONTHLY_INTEREST_RATE / CalculateDailyLateFee.DAYS_IN_MONTH;

    if (daysOverdue === 0) {
      return {
        originalAmount: this.roundCurrency(dto.originalAmount),
        dueDate: dueDateIso,
        calculationDate: calcDateIso,
        daysOverdue: 0,
        finePercentage: 2,
        fineAmount: 0,
        dailyInterestRatePercentage: this.roundRate(dailyInterestRate * 100),
        monthlyInterestRatePercentage: 1,
        interestAmount: 0,
        totalLateFee: 0,
        totalAmountDue: this.roundCurrency(dto.originalAmount),
      };
    }

    // Multa de 2% sobre o valor original
    const rawFine = dto.originalAmount * CalculateDailyLateFee.FINE_RATE;
    const fineAmount = this.roundCurrency(rawFine);

    // Juros de mora diários: (1% / 30) ao dia sobre o valor original
    const rawInterest = dto.originalAmount * dailyInterestRate * daysOverdue;
    const interestAmount = this.roundCurrency(rawInterest);

    const totalLateFee = this.roundCurrency(fineAmount + interestAmount);
    const totalAmountDue = this.roundCurrency(dto.originalAmount + totalLateFee);

    return {
      originalAmount: this.roundCurrency(dto.originalAmount),
      dueDate: dueDateIso,
      calculationDate: calcDateIso,
      daysOverdue,
      finePercentage: 2,
      fineAmount,
      dailyInterestRatePercentage: this.roundRate(dailyInterestRate * 100),
      monthlyInterestRatePercentage: 1,
      interestAmount,
      totalLateFee,
      totalAmountDue,
    };
  }

  private parseDate(dateInput: string | Date, fieldName: string): Date {
    let date: Date;

    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) {
        throw new Error(`${fieldName} is invalid`);
      }
      date = new Date(dateInput.getTime());
    } else if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      if (!trimmed) {
        throw new Error(`${fieldName} is required`);
      }
      
      // Checa formato YYYY-MM-DD
      const dateParts = trimmed.split("T")[0].split("-");
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        date = new Date(year, month, day);
      } else {
        date = new Date(trimmed);
      }

      if (isNaN(date.getTime())) {
        throw new Error(`${fieldName} is invalid`);
      }
    } else {
      throw new Error(`${fieldName} must be a valid date or string`);
    }

    return this.normalizeToMidnight(date);
  }

  private normalizeToMidnight(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundRate(value: number): number {
    return Math.round(value * 1000000) / 1000000;
  }
}
