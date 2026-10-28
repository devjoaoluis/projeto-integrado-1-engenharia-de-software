export interface ContractPropertyData {
  title?: string | null;
  address: string;
  neighborhood?: string | null;
  bedrooms?: number | null;
  type?: string | null;
  price: number;
  iptu?: number | null;
  description?: string | null;
}

export interface ContractContactData {
  name: string;
  cpfCnpj?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ContractRentalData {
  monthlyRent?: number | null;
  startDate?: number | string | null;
  endDate?: number | string | null;
  dueDay?: number | null;
}

export interface FillContractTemplateInput {
  templateContent: string;
  property: ContractPropertyData;
  owner?: ContractContactData | null;
  tenant: ContractContactData;
  guarantor?: ContractContactData | null;
  rental?: ContractRentalData | null;
  currentDate?: Date | number;
}

export interface FillContractTemplateResult {
  filledContent: string;
  replacementsCount: number;
  placeholdersFound: string[];
}

export function formatMoney(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCpfCnpj(doc: string | null | undefined): string {
  if (!doc) return "Não informado";
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "Não informado";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

export function formatDate(timestamp: number | string | null | undefined): string {
  if (!timestamp) return "Indeterminado";
  const dateObj = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
  if (isNaN(dateObj.getTime())) return String(timestamp);
  return dateObj.toLocaleDateString("pt-BR");
}

export function formatLongDate(dateObj: Date): string {
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  return `${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
}

export class FillContractTemplate {
  execute(input: FillContractTemplateInput): FillContractTemplateResult {
    const { templateContent, property, owner, tenant, guarantor, rental } = input;
    const now = input.currentDate ? (typeof input.currentDate === "number" ? new Date(input.currentDate) : input.currentDate) : new Date();

    const rentValue = rental?.monthlyRent ?? property.price;
    const rentFormatted = formatMoney(rentValue);
    const iptuFormatted = property.iptu ? formatMoney(property.iptu) : "Isento / Não informado";

    const ownerName = owner?.name?.trim() || "Proprietário não informado";
    const ownerCpf = formatCpfCnpj(owner?.cpfCnpj);
    const ownerPhone = formatPhone(owner?.phone);
    const ownerEmail = owner?.email?.trim() || "Não informado";

    const tenantName = tenant?.name?.trim() || "Locatário não informado";
    const tenantCpf = formatCpfCnpj(tenant?.cpfCnpj);
    const tenantPhone = formatPhone(tenant?.phone);
    const tenantEmail = tenant?.email?.trim() || "Não informado";

    const guarantorName = guarantor?.name?.trim() || "Não informado";
    const guarantorCpf = formatCpfCnpj(guarantor?.cpfCnpj);
    const guarantorPhone = formatPhone(guarantor?.phone);
    const guarantorEmail = guarantor?.email?.trim() || "Não informado";

    const dueDay = rental?.dueDay ? String(rental.dueDay) : "10";
    const startDateFormatted = rental?.startDate ? formatDate(rental.startDate) : formatDate(now.getTime());
    const endDateFormatted = rental?.endDate ? formatDate(rental.endDate) : "Indeterminado";

    const replacementMap: Record<string, string> = {
      // Imovel
      "imovel.titulo": property.title || "Imóvel Residencial",
      "imovel.endereco": property.address || "",
      "imovel.bairro": property.neighborhood || "Centro",
      "imovel.tipo": property.type || "Residencial",
      "imovel.quartos": property.bedrooms !== null && property.bedrooms !== undefined ? String(property.bedrooms) : "Não informado",
      "imovel.descricao": property.description || "Sem descrição adicional",
      "imovel.valor": rentFormatted,
      "imovel.preco": rentFormatted,
      "imovel.iptu": iptuFormatted,

      // Proprietario / Locador
      "proprietario.nome": ownerName,
      "proprietario.cpf": ownerCpf,
      "proprietario.cpfcnpj": ownerCpf,
      "proprietario.telefone": ownerPhone,
      "proprietario.email": ownerEmail,
      "locador.nome": ownerName,
      "locador.cpf": ownerCpf,
      "locador.cpfcnpj": ownerCpf,
      "locador.telefone": ownerPhone,
      "locador.email": ownerEmail,

      // Locatario
      "locatario.nome": tenantName,
      "locatario.cpf": tenantCpf,
      "locatario.cpfcnpj": tenantCpf,
      "locatario.telefone": tenantPhone,
      "locatario.email": tenantEmail,

      // Fiador
      "fiador.nome": guarantorName,
      "fiador.cpf": guarantorCpf,
      "fiador.cpfcnpj": guarantorCpf,
      "fiador.telefone": guarantorPhone,
      "fiador.email": guarantorEmail,

      // Aluguel / Contrato
      "aluguel.valor": rentFormatted,
      "aluguel.vencimento": dueDay,
      "aluguel.dia_vencimento": dueDay,
      "aluguel.inicio": startDateFormatted,
      "aluguel.fim": endDateFormatted,
      "contrato.valor": rentFormatted,
      "contrato.vencimento": dueDay,
      "contrato.inicio": startDateFormatted,
      "contrato.fim": endDateFormatted,

      // Datas
      "data_atual": formatLongDate(now),
      "dia": String(now.getDate()),
      "mes": String(now.getMonth() + 1),
      "ano": String(now.getFullYear()),
    };

    // Also support snake_case equivalents e.g. {{imovel_endereco}}, {{locatario_nome}}, etc.
    const extendedMap: Record<string, string> = { ...replacementMap };
    for (const [key, value] of Object.entries(replacementMap)) {
      if (key.includes(".")) {
        extendedMap[key.replace(/\./g, "_")] = value;
      }
    }

    let replacementsCount = 0;
    const placeholdersFound: string[] = [];

    // Replace {{placeholder}} or {{ placeholder }} case-insensitively
    const filledContent = templateContent.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, rawKey: string) => {
      placeholdersFound.push(rawKey);
      const normalizedKey = rawKey.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(extendedMap, normalizedKey)) {
        replacementsCount++;
        return extendedMap[normalizedKey];
      }
      return match;
    });

    return {
      filledContent,
      replacementsCount,
      placeholdersFound,
    };
  }
}
