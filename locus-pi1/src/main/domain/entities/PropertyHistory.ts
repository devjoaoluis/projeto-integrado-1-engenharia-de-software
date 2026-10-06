import { Property } from "./Property";
import { PropertyMedia } from "./PropertyMedia";

export interface PropertyContract {
  id: string;
  propertyId: string;
  tenantId: string;
  rentalId: string | null;
  reference: string;
  monthlyRent: number;
  startDate: number;
  endDate: number | null;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  createdAt: number;
}

export interface PropertyPayment {
  id: string;
  propertyId: string;
  contractId: string;
  amount: number;
  paidAt: number;
  description: string;
  createdAt: number;
}

export interface PropertyInspection {
  id: string;
  propertyId: string;
  inspectedAt: number;
  description: string;
  reportReference: string | null;
  createdAt: number;
}

export interface PropertyMaintenance {
  id: string;
  propertyId: string;
  performedAt: number;
  description: string;
  cost: number | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  createdAt: number;
}

export interface PropertyHistory {
  contracts: PropertyContract[];
  payments: PropertyPayment[];
  inspections: PropertyInspection[];
  maintenances: PropertyMaintenance[];
}

export interface PropertyOverview {
  property: Property;
  media: PropertyMedia[];
  contracts: {
    current: PropertyContract[];
    previous: PropertyContract[];
    scheduled: PropertyContract[];
  };
  payments: PropertyPayment[];
  inspections: PropertyInspection[];
  maintenances: PropertyMaintenance[];
}
