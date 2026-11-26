export interface OwnerPayoutItem {
  paymentId: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  contractId: string | null;
  contractReference: string;
  tenantId: string | null;
  tenantName: string;
  paidAt: number;
  description: string;
  grossAmount: number;
  adminFeePercent: number;
  adminFeeAmount: number;
  netAmount: number;
}

export interface OwnerPayoutReport {
  id: string;
  owner: {
    id: string;
    name: string;
    cpfCnpj: string | null;
    phone: string | null;
    email: string | null;
  };
  referenceMonth: string; // Ex: "03/2026"
  year: number;
  month: number;
  issuedAt: number;
  adminFeePercent: number;
  totalPropertiesCount: number;
  totalPaymentsCount: number;
  totalGrossAmount: number;
  totalAdminFeeAmount: number;
  totalNetAmount: number;
  items: OwnerPayoutItem[];
}
