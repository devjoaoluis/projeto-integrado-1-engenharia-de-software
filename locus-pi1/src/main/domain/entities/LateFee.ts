export interface DailyLateFeeCalculation {
  originalAmount: number;
  dueDate: string; // ISO date string (YYYY-MM-DD) ou YYYY-MM-DDTHH:mm:ss
  calculationDate: string;
  daysOverdue: number;
  finePercentage: number; // 2%
  fineAmount: number;
  dailyInterestRatePercentage: number; // (1% / 30) = ~0.03333333%
  monthlyInterestRatePercentage: number; // 1%
  interestAmount: number;
  totalLateFee: number;
  totalAmountDue: number;
}
