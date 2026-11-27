export type FinancialReportStatus = "RECEBIDO" | "EM_ATRASO" | "A_VENCER";

export interface FinancialReportEntry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  ownerName: string;
  tenantName: string;
  referenceMonth: string;
  dueDate: number;
  paidAt: number | null;
  rentCents: number;
  extrasCents: number;
  fineCents: number;
  interestCents: number;
  totalCents: number;
  adminFeeCents: number;
  netCents: number;
  status: FinancialReportStatus;
}

export interface FinancialReport {
  ownerName: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: number;
  adminFeeBasisPoints: number;
  totals: {
    receivedCents: number;
    overdueCents: number;
    dueCents: number;
  };
  properties: Array<{
    id: string;
    title: string;
    address: string;
    entries: FinancialReportEntry[];
    subtotalCents: number;
  }>;
}
