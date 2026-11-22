import { IOwnerRepository } from "../../domain/repositories/IOwnerRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { OwnerPayoutReport, OwnerPayoutItem } from "../../domain/entities/OwnerPayoutReport";

export interface GetOwnerPayoutReportInput {
  ownerId: string;
  referenceMonth?: string; // Formatos: "MM/YYYY", "M/YYYY", "YYYY-MM"
  month?: number;          // 1 a 12
  year?: number;           // Ex: 2026
  adminFeePercent?: number; // Padrão: 10%
  currentTimestamp?: number;
}

/**
 * Caso de uso: Gerar/Consolidar Relatório Mensal de Repasse ao Proprietário (HU-16 / RF18).
 * Consolida os pagamentos recebidos dos locatários para os imóveis de um proprietário em uma competência,
 * desconta a taxa de administração e apura o valor líquido de repasse.
 */
export class GetOwnerPayoutReport {
  constructor(
    private ownerRepository: IOwnerRepository,
    private propertyRepository: IPropertyRepository,
    private historyRepository: IPropertyHistoryRepository,
    private clientRepository?: IClientRepository,
  ) {}

  async execute(input: GetOwnerPayoutReportInput): Promise<OwnerPayoutReport> {
    const ownerId = input.ownerId?.trim();
    if (!ownerId) {
      throw new Error("O identificador do proprietário (ownerId) é obrigatório.");
    }

    const owner = await this.ownerRepository.findById(ownerId);
    if (!owner) {
      throw new Error(`Proprietário com id "${ownerId}" não encontrado.`);
    }

    const feePercent = input.adminFeePercent !== undefined ? input.adminFeePercent : 10;
    if (typeof feePercent !== "number" || feePercent < 0 || feePercent > 100 || isNaN(feePercent)) {
      throw new Error("A taxa de administração deve ser um número válido entre 0% e 100%.");
    }

    // Resolver mês e ano
    const { month, year, normalizedReferenceMonth, monthStart, monthEnd } = this.parseReferenceMonth(input);

    // Buscar todos os imóveis pertencentes ao proprietário
    const allProperties = await this.propertyRepository.findAll();
    const ownerProperties = allProperties.filter((p) => p.ownerId === ownerId);

    const items: OwnerPayoutItem[] = [];

    for (const property of ownerProperties) {
      const history = await this.historyRepository.findByPropertyId(property.id);

      // Pagamentos recebidos para o imóvel dentro da competência mensal
      const matchedPayments = history.payments.filter((payment) => {
        // Checagem 1: timestamp do pagamento dentro do mês de referência
        const paidAtDate = new Date(payment.paidAt);
        const inTimestampRange =
          (paidAtDate.getUTCFullYear() === year && paidAtDate.getUTCMonth() + 1 === month) ||
          (payment.paidAt >= monthStart && payment.paidAt <= monthEnd);

        // Checagem 2: descrição menciona explicitamente a competência de referência
        const desc = (payment.description || "").toLowerCase();
        const refNormalized = normalizedReferenceMonth.toLowerCase();
        const shortYear = String(year).slice(-2);
        const hasExplicitRef =
          desc.includes(refNormalized) ||
          desc.includes(`${month}/${year}`) ||
          desc.includes(`${month}/${shortYear}`) ||
          desc.includes(`${String(month).padStart(2, "0")}/${shortYear}`) ||
          this.matchesMonthNameInPortuguese(desc, month, year);

        return inTimestampRange || hasExplicitRef;
      });

      for (const payment of matchedPayments) {
        // Encontrar contrato vinculado
        const contract =
          history.contracts.find((c) => c.id === payment.contractId) ??
          history.contracts.find((c) => c.propertyId === property.id && c.status === "ACTIVE") ??
          history.contracts[0] ??
          null;

        let tenantName = "Locatário";
        const tenantId = contract ? contract.tenantId : null;

        if (tenantId && this.clientRepository) {
          const client = await this.clientRepository.findById(tenantId);
          if (client) {
            tenantName = client.name;
          }
        }

        const grossAmount = Math.round(payment.amount * 100) / 100;
        const adminFeeAmount = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
        const netAmount = Math.round((grossAmount - adminFeeAmount) * 100) / 100;

        items.push({
          paymentId: payment.id,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyAddress: property.address,
          contractId: contract ? contract.id : null,
          contractReference: contract ? contract.reference : `LOC-${property.id.slice(0, 5)}`,
          tenantId,
          tenantName,
          paidAt: payment.paidAt,
          description: payment.description,
          grossAmount,
          adminFeePercent: feePercent,
          adminFeeAmount,
          netAmount,
        });
      }
    }

    // Ordenar itens por data de pagamento
    items.sort((a, b) => b.paidAt - a.paidAt);

    const totalGrossAmount = Math.round(items.reduce((acc, i) => acc + i.grossAmount, 0) * 100) / 100;
    const totalAdminFeeAmount = Math.round(items.reduce((acc, i) => acc + i.adminFeeAmount, 0) * 100) / 100;
    const totalNetAmount = Math.round((totalGrossAmount - totalAdminFeeAmount) * 100) / 100;

    const issuedAt = input.currentTimestamp ?? Date.now();

    return {
      id: `repasse-${owner.id}-${year}-${String(month).padStart(2, "0")}`,
      owner: {
        id: owner.id,
        name: owner.name,
        cpfCnpj: owner.cpfCnpj ?? null,
        phone: owner.phone ?? null,
        email: owner.email ?? null,
      },
      referenceMonth: normalizedReferenceMonth,
      year,
      month,
      issuedAt,
      adminFeePercent: feePercent,
      totalPropertiesCount: ownerProperties.length,
      totalPaymentsCount: items.length,
      totalGrossAmount,
      totalAdminFeeAmount,
      totalNetAmount,
      items,
    };
  }

  private parseReferenceMonth(input: GetOwnerPayoutReportInput): {
    month: number;
    year: number;
    normalizedReferenceMonth: string;
    monthStart: number;
    monthEnd: number;
  } {
    let month: number | undefined = input.month;
    let year: number | undefined = input.year;

    if (input.referenceMonth?.trim()) {
      const ref = input.referenceMonth.trim();
      // Formato "MM/YYYY" ou "M/YYYY"
      const slashMatch = ref.match(/^(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        month = parseInt(slashMatch[1], 10);
        year = parseInt(slashMatch[2], 10);
      } else {
        // Formato "YYYY-MM" ou "YYYY/MM"
        const dashMatch = ref.match(/^(\d{4})[-/](\d{1,2})$/);
        if (dashMatch) {
          year = parseInt(dashMatch[1], 10);
          month = parseInt(dashMatch[2], 10);
        }
      }
    }

    if (month === undefined || year === undefined) {
      const refDate = new Date(input.currentTimestamp ?? Date.now());
      if (month === undefined) month = refDate.getUTCMonth() + 1;
      if (year === undefined) year = refDate.getUTCFullYear();
    }

    if (month < 1 || month > 12) {
      throw new Error(`Mês de referência inválido: ${month}. O mês deve estar entre 1 e 12.`);
    }

    if (year < 1900 || year > 2200) {
      throw new Error(`Ano de referência inválido: ${year}.`);
    }

    const normalizedReferenceMonth = `${String(month).padStart(2, "0")}/${year}`;
    const monthStart = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = Date.UTC(year, month, 0, 23, 59, 59, 999);

    return { month, year, normalizedReferenceMonth, monthStart, monthEnd };
  }

  private matchesMonthNameInPortuguese(desc: string, month: number, year: number): boolean {
    const monthNames = [
      ["janeiro", "jan"],
      ["fevereiro", "fev"],
      ["marco", "março", "mar"],
      ["abril", "abr"],
      ["maio", "mai"],
      ["junho", "jun"],
      ["julho", "jul"],
      ["agosto", "ago"],
      ["setembro", "set"],
      ["outubro", "out"],
      ["novembro", "nov"],
      ["dezembro", "dez"],
    ];
    const names = monthNames[month - 1] || [];
    const hasMonth = names.some((n) => desc.includes(n));
    const hasYear = desc.includes(String(year)) || desc.includes(String(year).slice(-2));
    return hasMonth && hasYear;
  }
}
