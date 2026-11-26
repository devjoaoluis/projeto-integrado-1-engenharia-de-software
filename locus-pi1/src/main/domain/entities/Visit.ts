export type VisitStatus = "AGENDADA" | "REALIZADA" | "CANCELADA";

export interface Visit {
  id: string;
  propertyId: string;
  clientId: string;
  scheduledAt: number; // Timestamp em milissegundos da data e hora da visita
  status: VisitStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VisitWithDetails extends Visit {
  propertyTitle: string;
  propertyAddress: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
}
