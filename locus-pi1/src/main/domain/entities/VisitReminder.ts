export type VisitReminderStage =
  | "UPCOMING_24H"  // Lembrete preventivo (24 horas antes)
  | "TODAY"         // Lembrete do dia da visita
  | "IMMINENT_1H"   // Lembrete de urgência (próximos 60 minutos)
  | "NOW"           // No momento da visita (horário exato)
  | "OVERDUE";      // Visita agendada para hoje com horário expirado e ainda pendente

export type VisitAlertUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface VisitReminder {
  id: string;
  visitId: string;
  stage: VisitReminderStage;
  triggeredAt: number;
  dismissedAt: number | null;
  createdAt: number;
}

export interface VisitAlert {
  id: string; // Ex: `${visitId}:${stage}`
  visitId: string;
  stage: VisitReminderStage;
  urgency: VisitAlertUrgency;
  scheduledAt: number;
  diffMinutes: number; // minutos até a visita (positivo = futuro, negativo = passado)
  title: string;
  message: string;
  property: {
    id: string;
    title: string;
    address: string;
  };
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  notes: string | null;
  isDismissed: boolean;
  dismissedAt?: number | null;
}
