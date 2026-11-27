export interface DailyLateFeeCalculation {
  originalAmount: number;
  dueDate: string; // ISO date string (YYYY-MM-DD) ou YYYY-MM-DDTHH:mm:ss
  calculationDate: string;
  daysOverdue: number;
  finePercentage: number;
  fineAmount: number;
  dailyInterestRatePercentage: number;
  monthlyInterestRatePercentage: number;
  interestAmount: number;
  totalLateFee: number;
  totalAmountDue: number;
}
