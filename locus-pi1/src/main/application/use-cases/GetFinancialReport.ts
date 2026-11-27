import { FinancialReport, FinancialReportEntry, FinancialReportStatus } from "../../domain/entities/FinancialReport";
import { IFinancialRepository } from "../../domain/repositories/IFinancialRepository";
import { IOwnerRepository } from "../../domain/repositories/IOwnerRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { ListPayments } from "./ListPayments";

export interface GetFinancialReportInput {
  ownerId: string;
  propertyIds: string[];
  periodStart: string;
  periodEnd: string;
  includeStatuses: FinancialReportStatus[];
}

function parseDateOnly(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Informe o período no formato de data válido.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200) throw new Error("O ano do período está fora do intervalo permitido.");
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new Error("O período contém uma data inválida.");
  }
  return timestamp;
}

function withinPeriod(timestamp: number, start: number, end: number): boolean {
  return timestamp >= start && timestamp <= end;
}

function feeOnCents(amountCents: number, rateBasisPoints: number): number {
  return Number((BigInt(amountCents) * BigInt(rateBasisPoints) + 5_000n) / 10_000n);
}

export class GetFinancialReport {
  constructor(
    private listPayments: ListPayments,
    private ownerRepository: IOwnerRepository,
    private propertyRepository: IPropertyRepository,
    private financialRepository: IFinancialRepository,
  ) {}

  async execute(input: GetFinancialReportInput): Promise<FinancialReport> {
    if (!input || typeof input !== "object") throw new Error("Informe os filtros do relatório.");
    if (typeof input.ownerId !== "string" || !input.ownerId.trim()) {
      throw new Error("Selecione um proprietário ou a opção todos.");
    }
    if (!Array.isArray(input.propertyIds) || input.propertyIds.some((id) => typeof id !== "string")) {
      throw new Error("A seleção de imóveis é inválida.");
    }
    const start = parseDateOnly(input.periodStart);
    const end = parseDateOnly(input.periodEnd) + 86_400_000 - 1;
    if (start > end) throw new Error("A data inicial não pode ser posterior à data final.");
    const validStatuses: FinancialReportStatus[] = ["RECEBIDO", "EM_ATRASO", "A_VENCER"];
    if (
      !Array.isArray(input.includeStatuses)
      || input.includeStatuses.length === 0
      || input.includeStatuses.some((status) => !validStatuses.includes(status))
    ) {
      throw new Error("Marque ao menos uma situação para incluir no relatório.");
    }

    const allProperties = await this.propertyRepository.findAll();
    const ownerId = input.ownerId === "ALL" ? null : input.ownerId.trim();
    const owner = ownerId ? await this.ownerRepository.findById(ownerId) : null;
    if (ownerId && !owner) throw new Error("O proprietário selecionado não foi encontrado.");
    const propertyIds = new Set(input.propertyIds);
    if (propertyIds.size === 0) throw new Error("Selecione ao menos um imóvel para o relatório.");
    const selectedProperties = allProperties.filter((property) =>
      (!ownerId || property.ownerId === ownerId)
      && propertyIds.has(property.id),
    );
    if (propertyIds.size > 0 && selectedProperties.length !== propertyIds.size) {
      throw new Error("Um ou mais imóveis selecionados não pertencem ao proprietário informado.");
    }

    const [payments, settings] = await Promise.all([
      this.listPayments.execute(undefined, Date.now()),
      this.financialRepository.getGlobalSettings(),
    ]);
    const propertyMap = new Map(selectedProperties.map((property) => [property.id, property] as const));
    const ownerNames = new Map<string, string>();
    for (const property of selectedProperties) {
      if (property.ownerId && !ownerNames.has(property.ownerId)) {
        const propertyOwner = await this.ownerRepository.findById(property.ownerId);
        ownerNames.set(property.ownerId, propertyOwner?.name ?? "Proprietário");
      }
    }

    const entriesByProperty = new Map<string, FinancialReportEntry[]>();
    const include = new Set(input.includeStatuses);
    for (const installment of payments) {
      const property = propertyMap.get(installment.propertyId);
      if (!property) continue;
      const entryList = entriesByProperty.get(property.id) ?? [];
      const ownerName = property.ownerId ? ownerNames.get(property.ownerId) ?? "Proprietário" : "Sem proprietário";

      if (include.has("RECEBIDO")) {
        for (const receipt of installment.receipts) {
          if (!withinPeriod(receipt.paidAt, start, end)) continue;
          const amountCents = receipt.amountCents ?? Math.round(receipt.amount * 100);
          const fineCents = receipt.fineAmountCents ?? 0;
          const interestCents = receipt.interestAmountCents ?? 0;
          const rentCents = receipt.rentAmountCents ?? receipt.principalAmountCents ?? amountCents;
          const adminFeeCents = feeOnCents(rentCents, settings.adminFeeBasisPoints);
          entryList.push({
            id: receipt.id,
            propertyId: property.id,
            propertyTitle: property.title,
            propertyAddress: property.address,
            ownerName,
            tenantName: installment.tenantName,
            referenceMonth: installment.referenceMonth,
            dueDate: installment.dueDate,
            paidAt: receipt.paidAt,
            rentCents,
            extrasCents: receipt.expensesAmountCents ?? 0,
            fineCents,
            interestCents,
            totalCents: amountCents,
            adminFeeCents,
            netCents: amountCents - adminFeeCents,
            status: "RECEBIDO",
          });
        }
      }

      const outstandingStatus: FinancialReportStatus | null = installment.status === "ATRASADO"
        ? "EM_ATRASO"
        : installment.status === "PENDENTE"
          ? "A_VENCER"
          : null;
      if (
        outstandingStatus
        && include.has(outstandingStatus)
        && withinPeriod(installment.dueDate, start, end)
      ) {
        const totalCents = Math.round(installment.totalAmount * 100);
        const adminFeeCents = feeOnCents(installment.rentOutstandingCents, settings.adminFeeBasisPoints);
        entryList.push({
          id: `${installment.id}-${outstandingStatus}`,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyAddress: property.address,
          ownerName,
          tenantName: installment.tenantName,
          referenceMonth: installment.referenceMonth,
          dueDate: installment.dueDate,
          paidAt: null,
          rentCents: installment.rentOutstandingCents,
          extrasCents: installment.expensesOutstandingCents,
          fineCents: installment.fineOutstandingCents,
          interestCents: installment.interestOutstandingCents,
          totalCents,
          adminFeeCents,
          netCents: totalCents - adminFeeCents,
          status: outstandingStatus,
        });
      }
      entriesByProperty.set(property.id, entryList);
    }

    const reportProperties = selectedProperties.map((property) => {
      const entries = (entriesByProperty.get(property.id) ?? [])
        .sort((a, b) => a.dueDate - b.dueDate || (a.paidAt ?? 0) - (b.paidAt ?? 0));
      return {
        id: property.id,
        title: property.title,
        address: property.address,
        entries,
        subtotalCents: entries.reduce((sum, item) => sum + item.totalCents, 0),
      };
    });
    const allEntries = reportProperties.flatMap((item) => item.entries);
    const sumStatus = (status: FinancialReportStatus) =>
      allEntries.filter((item) => item.status === status).reduce((sum, item) => sum + item.totalCents, 0);
    return {
      ownerName: owner?.name ?? "Todos os proprietários",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      issuedAt: Date.now(),
      adminFeeBasisPoints: settings.adminFeeBasisPoints,
      totals: {
        receivedCents: sumStatus("RECEBIDO"),
        overdueCents: sumStatus("EM_ATRASO"),
        dueCents: sumStatus("A_VENCER"),
      },
      properties: reportProperties,
    };
  }
}
