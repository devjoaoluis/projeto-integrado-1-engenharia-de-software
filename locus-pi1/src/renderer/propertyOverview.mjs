const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = value => value === null || value === undefined ? "Sem data final" : new Date(value).toLocaleDateString("pt-BR");
const propertyStatuses = { CADASTRADO: "Cadastrado", DISPONIVEL: "Disponível", ALUGADO: "Alugado", VENDIDO: "Vendido", INATIVO: "Inativo" };
const maintenanceStatuses = { PENDING: "Pendente", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída" };

export function mediaFileUrl(filePath) {
  const encoded = filePath.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/")
    .replace(/^\/+/, "").replace(/^([a-z])%3A/i, "$1:");
  return `file:///${encoded}`;
}

export function adaptPropertyOverview(overview, tenantNames = {}) {
  const { property, media, contracts, payments, inspections, maintenances } = overview;
  const photo = media.find(item => item.type === "IMAGE");
  return {
    id: property.id,
    titulo: property.title,
    endereco: property.address,
    descricao: property.description ?? "",
    quartos: property.bedrooms,
    tipo: property.type ?? "",
    ownerId: property.ownerId ?? null,
    valor: property.price,
    status: propertyStatuses[property.status] ?? property.status,
    foto: photo ? mediaFileUrl(photo.filePath) : null,
    midias: media.map(item => ({
      id: item.id,
      tipo: item.type,
      nome: item.fileName,
      url: mediaFileUrl(item.filePath),
    })),
    contratos: [
      ...contracts.current.map(item => ({ ...item, label: "Vigente" })),
      ...contracts.previous.map(item => ({ ...item, label: item.status === "CANCELLED" ? "Cancelado" : "Encerrado" })),
      ...contracts.scheduled.map(item => ({ ...item, label: "Agendado" })),
    ].map(item => ({
      id: item.id, codigo: item.reference, locatario: tenantNames[item.tenantId] ?? "Locatário não encontrado",
      inicio: date(item.startDate), fim: date(item.endDate), valor: item.monthlyRent, status: item.label,
    })),
    pagamentos: payments.map(item => ({
      id: item.id, mesReferencia: item.description, vencimento: date(item.paidAt), valor: item.amount, status: "Pago",
    })),
    vistorias: [
      ...inspections.map(item => ({
        id: `inspection-${item.id}`, timestamp: item.inspectedAt, data: date(item.inspectedAt), tipo: "Vistoria",
        responsavel: item.reportReference ?? "—", observacao: item.description,
      })),
      ...maintenances.map(item => ({
        id: `maintenance-${item.id}`, timestamp: item.performedAt, data: date(item.performedAt), tipo: "Manutenção",
        responsavel: maintenanceStatuses[item.status] ?? item.status,
        observacao: item.cost === null ? item.description : `${item.description} — ${money(item.cost)}`,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp),
  };
}
