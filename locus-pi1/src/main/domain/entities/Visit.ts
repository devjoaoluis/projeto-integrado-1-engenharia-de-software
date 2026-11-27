export type VisitStatus = "AGENDADA" | "REALIZADA" | "CANCELADA";
export const VISIT_REMINDER_LEADS_MINUTES = [30, 1440, 2880, 10080] as const;
export type VisitReminderLeadMinutes = (typeof VISIT_REMINDER_LEADS_MINUTES)[number];

export interface Visit {
  id: string;
  propertyId: string;
  clientId: string;
  scheduledAt: number; // Timestamp em milissegundos da data e hora da visita
  reminderLeadMinutes: VisitReminderLeadMinutes | null;
  notificationSent: boolean;
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
