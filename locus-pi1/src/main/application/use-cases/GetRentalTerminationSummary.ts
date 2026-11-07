import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";

export interface RentalPaymentRecord {
  id: string;
  amount: number;
  paidAt: number;
  description: string;
}

export interface PendingRentDebt {
  referenceMonth: string; // Ex: "02/2026"
  dueDate: number;        // timestamp da data de vencimento
  amount: number;         // valor pendente nesta competência
}

export interface RentalTerminationSummary {
  rentalId: string;
  contractId: string | null;
  propertyId: string;
  propertyTitle: string | null;
  tenantId: string;
  tenantName: string | null;
  monthlyRent: number;
  startDate: number;
  dueDay: number;

  // Vistorias e Chaves (RN03)
  keysReleased: boolean;
  exitInspectionRequired: boolean;
  hasExitInspection: boolean;
  canTerminate: boolean;
  blockReason: string | null;

  // Situação Financeira (Aba de Pagamentos / Débitos)
  totalPaid: number;
  totalExpected: number;
  pendingAmount: number;
  hasPendingDebts: boolean;
  debtAlertMessage: string | null;
  paidPayments: RentalPaymentRecord[];
  pendingDebts: PendingRentDebt[];
}

/**
 * Caso de uso: Obter resumo de rescisão de contrato e desassociação do locatário (HU-14).
 * Permite ao corretor verificar débitos pendentes da aba de pagamentos e status de vistorias
 * antes de confirmar a liberação do imóvel no sistema.
 */
export class GetRentalTerminationSummary {
  constructor(
    private rentalRepository: IRentalRepository,
    private historyRepository: IPropertyHistoryRepository,
    private inspectionRepository?: IInspectionRepository,
    private clientRepository?: IClientRepository,
    private propertyRepository?: IPropertyRepository,
  ) {}

  async execute(rentalId: string, currentTimestamp = Date.now()): Promise<RentalTerminationSummary> {
    if (typeof rentalId !== "string" || !rentalId.trim()) {
      throw new Error("Rental id is required");
    }

    const rental = await this.rentalRepository.findById(rentalId);
    if (!rental) {
      throw new Error(`Rental with id ${rentalId} not found`);
    }

    // Busca histórico de contratos e pagamentos vinculados ao imóvel
    const history = await this.historyRepository.findByPropertyId(rental.propertyId);
    const contract = history.contracts.find((c) => c.rentalId === rental.id) ?? null;
    const contractId = contract ? contract.id : null;

    // Filtra os pagamentos associados a este contrato (ou ao imóvel desta locação)
    const contractPayments = history.payments.filter((p) =>
      contractId ? p.contractId === contractId : p.propertyId === rental.propertyId
    );

    const paidPayments: RentalPaymentRecord[] = contractPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt,
      description: p.description,
    }));

    const totalPaid = paidPayments.reduce((acc, p) => acc + p.amount, 0);

    // Calcula parcelas que deveriam ter sido pagas até agora com base no início e dia de vencimento
    const expectedCharges = this.calculateExpectedCharges(
      rental.startDate,
      rental.dueDay,
      rental.monthlyRent,
      currentTimestamp
    );

    const totalExpected = expectedCharges.reduce((acc, c) => acc + c.amount, 0);
    const pendingAmount = Math.max(0, Math.round((totalExpected - totalPaid) * 100) / 100);
    const hasPendingDebts = pendingAmount > 0;

    // Aloca pagamentos contra as cobranças para identificar as parcelas pendentes
    const pendingDebts = this.calculatePendingDebts(expectedCharges, totalPaid);

    // Mensagem de alerta caso existam dívidas pendentes
    let debtAlertMessage: string | null = null;
    if (hasPendingDebts) {
      const formattedAmount = pendingAmount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      debtAlertMessage = `Atenção: O locatário possui débitos pendentes no valor total de ${formattedAmount}. Verifique os pagamentos antes de liberar o imóvel.`;
    }

    // Regra de Vistoria de Saída (RN03): obrigatória se as chaves foram entregues
    const keysReleased = rental.keysReleasedAt !== null;
    const exitInspectionRequired = keysReleased;
    let hasExitInspection = false;

    if (this.inspectionRepository && exitInspectionRequired) {
      const inspections = contractId
        ? await this.inspectionRepository.findByContractId(contractId)
        : await this.inspectionRepository.findByPropertyId(rental.propertyId);
      hasExitInspection = inspections.some(
        (i) => i.type === "EXIT" && (!contractId || i.contractId === contractId)
      );
    }

    let canTerminate = true;
    let blockReason: string | null = null;
    if (exitInspectionRequired && !hasExitInspection) {
      canTerminate = false;
      blockReason = "RN03: A vistoria de saída é obrigatória para o encerramento da locação.";
    }

    // Resgate de dados amigáveis para exibição no modal
    let tenantName: string | null = null;
    if (this.clientRepository) {
      const tenant = await this.clientRepository.findById(rental.tenantId);
      if (tenant) tenantName = tenant.name;
    }

    let propertyTitle: string | null = null;
    if (this.propertyRepository) {
      const property = await this.propertyRepository.findById(rental.propertyId);
      if (property) propertyTitle = property.title;
    }

    return {
      rentalId: rental.id,
      contractId,
      propertyId: rental.propertyId,
      propertyTitle,
      tenantId: rental.tenantId,
      tenantName,
      monthlyRent: rental.monthlyRent,
      startDate: rental.startDate,
      dueDay: rental.dueDay,
      keysReleased,
      exitInspectionRequired,
      hasExitInspection,
      canTerminate,
      blockReason,
      totalPaid,
      totalExpected,
      pendingAmount,
      hasPendingDebts,
      debtAlertMessage,
      paidPayments,
      pendingDebts,
    };
  }

  /**
   * Gera as parcelas devidas desde a data de início da locação até o momento da consulta.
   */
  private calculateExpectedCharges(
    startDateTimestamp: number,
    dueDay: number,
    monthlyRent: number,
    currentTimestamp: number
  ): Array<{ referenceMonth: string; dueDate: number; amount: number }> {
    const charges: Array<{ referenceMonth: string; dueDate: number; amount: number }> = [];

    const start = new Date(startDateTimestamp);

    let currentYear = start.getUTCFullYear();
    let currentMonth = start.getUTCMonth(); // 0-indexed

    while (true) {
      const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const actualDay = Math.min(dueDay, daysInMonth);
      const dueDate = new Date(Date.UTC(currentYear, currentMonth, actualDay, 23, 59, 59, 999));
      const dueTimestamp = dueDate.getTime();

      // Se o vencimento cair antes da data de início do aluguel, o primeiro vencimento será no próximo mês
      if (dueTimestamp < startDateTimestamp) {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        continue;
      }

      // Se o vencimento for posterior ao momento da consulta, interrompe
      if (dueTimestamp > currentTimestamp) {
        break;
      }

      const monthStr = String(currentMonth + 1).padStart(2, "0");
      charges.push({
        referenceMonth: `${monthStr}/${currentYear}`,
        dueDate: dueTimestamp,
        amount: monthlyRent,
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }

      // Proteção de overflow
      if (charges.length > 600) break;
    }

    return charges;
  }

  /**
   * Aloca pagamentos efetuados contra cobranças na ordem cronológica (FIFO)
   * para isolar parcelas pendentes.
   */
  private calculatePendingDebts(
    expectedCharges: Array<{ referenceMonth: string; dueDate: number; amount: number }>,
    totalPaid: number
  ): PendingRentDebt[] {
    let remainingPaid = totalPaid;
    const pending: PendingRentDebt[] = [];

    for (const charge of expectedCharges) {
      if (remainingPaid >= charge.amount) {
        remainingPaid -= charge.amount;
      } else {
        const unpaidForThisMonth = charge.amount - remainingPaid;
        remainingPaid = 0;
        pending.push({
          referenceMonth: charge.referenceMonth,
          dueDate: charge.dueDate,
          amount: Math.round(unpaidForThisMonth * 100) / 100,
        });
      }
    }

    return pending;
  }
}
