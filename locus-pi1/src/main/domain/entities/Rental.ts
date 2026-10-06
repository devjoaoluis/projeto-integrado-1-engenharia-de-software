export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  monthlyRent: number;
  startDate: number;
  dueDay: number;
  parentRentalId: string | null;
  formalConsent: string | null;
  contractSigned: boolean;
  signaturesNotarized: boolean;
  initialPaymentsPaid: boolean;
  keysReleasedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
