import { CheckOverdueRents, CheckOverdueRentsOptions } from "./CheckOverdueRents";
import { OverdueNotification, OverdueDebtItem } from "../../domain/entities/OverdueRent";
import { AppNotification } from "../../domain/entities/AppNotification";
import { NotificationService } from "../services/NotificationService";
import { ListPayments } from "./ListPayments";

export interface TriggerOverdueAlertsInput extends CheckOverdueRentsOptions {
  channel?: "SYSTEM" | "EMAIL" | "WHATSAPP";
}

export interface TriggerOverdueAlertsResult {
  triggeredCount: number;
  skippedCount: number;
  notifications: OverdueNotification[];
  upcomingNotifications: AppNotification[];
  debts: OverdueDebtItem[];
  checkedAt: number;
}

export class TriggerOverdueAlerts {
  constructor(
    private checkOverdueRents: CheckOverdueRents,
    private notificationService: NotificationService,
    private listPayments?: ListPayments,
  ) {}

  async execute(input?: TriggerOverdueAlertsInput): Promise<TriggerOverdueAlertsResult> {
    const currentTimestamp = input?.currentTimestamp ?? Date.now();
    const channel = input?.channel ?? "SYSTEM";

    // 1. Executa a rotina de verificação de atrasos
    const checkResult = await this.checkOverdueRents.execute({
      rentalId: input?.rentalId,
      tenantId: input?.tenantId,
      currentTimestamp,
    });

    const notifications: OverdueNotification[] = [];
    const upcomingNotifications: AppNotification[] = [];
    let triggeredCount = 0;
    let skippedCount = 0;

    if (this.listPayments) {
      const currentDay = Math.floor(Date.UTC(
        new Date(currentTimestamp).getUTCFullYear(),
        new Date(currentTimestamp).getUTCMonth(),
        new Date(currentTimestamp).getUTCDate(),
      ) / 86_400_000);
      const payments = await this.listPayments.execute(input?.tenantId, currentTimestamp);
      for (const payment of payments) {
        const dueDate = new Date(payment.dueDate);
        const dueDay = Math.floor(Date.UTC(
          dueDate.getUTCFullYear(),
          dueDate.getUTCMonth(),
          dueDate.getUTCDate(),
        ) / 86_400_000);
        if (payment.status !== "PENDENTE" || dueDay !== currentDay + 1) continue;

        const dueDateText = dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" });
        const amountText = payment.totalAmount.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        const message = `Aluguel de ${payment.tenantName} vence amanhã (${dueDateText}). Valor: ${amountText}.`;
        const result = await this.notificationService.publish({
          id: `rent-due-tomorrow:${payment.rentalId}:${payment.referenceMonth}`,
          category: "SYSTEM",
          title: `Aluguel vence amanhã: ${payment.tenantName}`,
          message,
          target: `/pagamentos?tenantId=${encodeURIComponent(payment.tenantId)}`,
          entityId: payment.rentalId,
          data: {
            rentalId: payment.rentalId,
            contractId: payment.contractId,
            tenantId: payment.tenantId,
            referenceMonth: payment.referenceMonth,
            dueDate: payment.dueDate,
          },
          createdAt: currentTimestamp,
        });
        upcomingNotifications.push(result.notification);
        if (result.created) triggeredCount++;
        else skippedCount++;
      }
    }

    for (const debt of checkResult.debts) {
      const message = this.buildAlertMessage(debt);
      const notification: OverdueNotification = {
        id: `overdue:${debt.rentalId}:${debt.referenceMonth}`,
        rentalId: debt.rentalId,
        contractId: debt.contractId,
        tenantId: debt.tenantId,
        referenceMonth: debt.referenceMonth,
        dueDate: debt.dueDate,
        daysOverdue: debt.daysOverdue,
        originalAmount: debt.originalAmount,
        interestAmount: debt.interestAmount,
        fineAmount: debt.fineAmount,
        totalAmount: debt.totalAmount,
        message,
        channel,
        createdAt: currentTimestamp,
      };

      const result = await this.notificationService.publish({
        id: notification.id,
        category: "OVERDUE",
        title: `Aluguel em atraso: ${debt.tenantName || "Locatário"}`,
        message,
        target: `/pagamentos?tenantId=${encodeURIComponent(debt.tenantId)}`,
        entityId: debt.rentalId,
        data: { ...notification },
        createdAt: currentTimestamp,
      });
      notifications.push(notification);
      if (result.created) triggeredCount++;
      else skippedCount++;
    }

    return {
      triggeredCount,
      skippedCount,
      notifications,
      upcomingNotifications,
      debts: checkResult.debts,
      checkedAt: currentTimestamp,
    };
  }

  private buildAlertMessage(debt: OverdueDebtItem): string {
    const tenantGreeting = debt.tenantName ? `Prezado(a) ${debt.tenantName}` : "Prezado(a) Locatário(a)";
    const propertyInfo = debt.propertyTitle ? `do imóvel "${debt.propertyTitle}"` : "do imóvel locado";
    const dueDateStr = new Date(debt.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const originalStr = debt.originalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const chargesStr = (debt.interestAmount + debt.fineAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const totalStr = debt.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    let msg = `${tenantGreeting}, identificamos que a parcela de aluguel referente ao mês ${debt.referenceMonth} ${propertyInfo}, com vencimento em ${dueDateStr}, encontra-se em atraso há ${debt.daysOverdue} dia(s). Valor original: ${originalStr}, encargos conforme as regras financeiras configuradas: ${chargesStr}. Total atualizado para quitação: ${totalStr}.`;

    if (debt.isOverTwoMonths) {
      msg += " [AVISO IMPORTANTE - RN05]: O débito possui mais de 2 meses de atraso (>60 dias). A baixa automática do débito está bloqueada pelo sistema e permanecerá pendente até regularização ou baixa manual com o corretor.";
    }

    return msg;
  }
}

