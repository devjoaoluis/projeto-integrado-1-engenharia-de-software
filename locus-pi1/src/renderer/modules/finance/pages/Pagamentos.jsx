import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileText, Printer, Receipt, Search, Wallet, X } from "lucide-react";

const moeda = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarData = (timestamp) => timestamp ? new Date(timestamp).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
const agoraParaInput = () => {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 10);
};
const valorParaCampo = (value) => (Number(value || 0) / 100).toFixed(2);
const percentualParaCampo = (value) => (Number(value || 0) / 100).toFixed(2);
const primeiroDiaDoMes = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
const ultimoDiaDoMes = (date = new Date()) => {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

export default function Pagamentos() {
  const [searchParams] = useSearchParams();
  const [pagamentos, setPagamentos] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [regrasFinanceiras, setRegrasFinanceiras] = useState(null);
  const [rascunhoRegras, setRascunhoRegras] = useState(null);
  const [contratoRegrasId, setContratoRegrasId] = useState("");
  const [rascunhoContratoRegras, setRascunhoContratoRegras] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState("ATRASADO");
  const [mesFiltro, setMesFiltro] = useState("");
  const [tenantFiltro, setTenantFiltro] = useState(searchParams.get("tenantId") || "");
  const [propertyFiltro, setPropertyFiltro] = useState(searchParams.get("propertyId") || "");
  const [ownerFiltro, setOwnerFiltro] = useState("");
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  const [detalheSelecionado, setDetalheSelecionado] = useState(null);
  const [dataPagamento, setDataPagamento] = useState(agoraParaInput());
  const [valorPagamento, setValorPagamento] = useState("");
  const [comprovante, setComprovante] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvandoRegras, setSalvandoRegras] = useState(false);
  const [salvandoRegrasContrato, setSalvandoRegrasContrato] = useState(false);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [ultimoRecebimentoId, setUltimoRecebimentoId] = useState("");
  const [competenciaItem, setCompetenciaItem] = useState(new Date().toISOString().slice(0, 7));
  const [contratoItem, setContratoItem] = useState("");
  const [categoriaItem, setCategoriaItem] = useState("IPTU");
  const [descricaoItem, setDescricaoItem] = useState("");
  const [valorItem, setValorItem] = useState("");
  const [ownerId, setOwnerId] = useState("ALL");
  const [propertyReportIds, setPropertyReportIds] = useState([]);
  const [propertyReportAll, setPropertyReportAll] = useState(true);
  const [reportPropertySearch, setReportPropertySearch] = useState("");
  const [reportPeriodMode, setReportPeriodMode] = useState("CURRENT");
  const [reportStart, setReportStart] = useState(primeiroDiaDoMes());
  const [reportEnd, setReportEnd] = useState(ultimoDiaDoMes());
  const [reportStatuses, setReportStatuses] = useState(["RECEBIDO", "EM_ATRASO", "A_VENCER"]);
  const [financialReport, setFinancialReport] = useState(null);
  const [reportPreferencesLoaded, setReportPreferencesLoaded] = useState(false);

  useEffect(() => {
    setTenantFiltro(searchParams.get("tenantId") || "");
    setPropertyFiltro(searchParams.get("propertyId") || "");
  }, [searchParams]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("locus.finance.report") || "null");
      if (saved && typeof saved === "object") {
        setOwnerId(saved.ownerId || "ALL");
        setPropertyReportIds(Array.isArray(saved.propertyReportIds) ? saved.propertyReportIds : []);
        setPropertyReportAll(saved.propertyReportAll !== false);
        setReportPeriodMode(saved.reportPeriodMode || "CURRENT");
        setReportStart(saved.reportStart || primeiroDiaDoMes());
        setReportEnd(saved.reportEnd || ultimoDiaDoMes());
        setReportStatuses(Array.isArray(saved.reportStatuses) ? saved.reportStatuses : ["RECEBIDO", "EM_ATRASO", "A_VENCER"]);
      }
    } catch (error) {
      console.error("Não foi possível restaurar as preferências do relatório financeiro:", error);
    } finally {
      setReportPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!reportPreferencesLoaded) return;
    localStorage.setItem("locus.finance.report", JSON.stringify({
      ownerId,
      propertyReportIds,
      propertyReportAll,
      reportPeriodMode,
      reportStart,
      reportEnd,
      reportStatuses,
    }));
  }, [reportPreferencesLoaded, ownerId, propertyReportIds, propertyReportAll, reportPeriodMode, reportStart, reportEnd, reportStatuses]);

  async function carregarDados() {
    setLoading(true);
    setErro("");
    try {
      const [items, properties, owners, tenants, contractItems, settings] = await Promise.all([
        window.api.payments.list(),
        window.api.properties.list(),
        window.api.owners.list(),
        window.api.clients.list(),
        window.api.rentals.listContractHistory(),
        window.api.payments.getSettings(),
      ]);
      setPagamentos(items || []);
      setImoveis(properties || []);
      setProprietarios(owners || []);
      setClientes(tenants || []);
      setContratos(contractItems || []);
      setRegrasFinanceiras(settings);
      setRascunhoRegras({
        graceDays: String(settings.graceDays),
        finePercent: percentualParaCampo(settings.fineRateBasisPoints),
        interestPercent: percentualParaCampo(settings.monthlyInterestBasisPoints),
        adminFeePercent: percentualParaCampo(settings.adminFeeBasisPoints),
      });
    } catch (error) {
      setErro(error?.message || "Não foi possível carregar os dados financeiros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarDados(); }, []);

  const filtrados = useMemo(() => {
    const texto = busca.trim().toLocaleLowerCase("pt-BR");
    const referenciaFiltro = mesFiltro ? `${mesFiltro.slice(5, 7)}/${mesFiltro.slice(0, 4)}` : "";
    return pagamentos.filter((item) => {
      if (tenantFiltro && item.tenantId !== tenantFiltro) return false;
      if (propertyFiltro && item.propertyId !== propertyFiltro) return false;
      if (aba !== "TODOS" && item.status !== aba) return false;
      if (referenciaFiltro && item.referenceMonth !== referenciaFiltro) return false;
      if (ownerFiltro && item.ownerId !== ownerFiltro) return false;
      return !texto || `${item.tenantName} ${item.propertyTitle}`.toLocaleLowerCase("pt-BR").includes(texto);
    });
  }, [pagamentos, busca, aba, mesFiltro, tenantFiltro, propertyFiltro, ownerFiltro]);

  const resumo = useMemo(() => {
    const now = new Date();
    const currentReference = `${String(now.getUTCMonth() + 1).padStart(2, "0")}/${now.getUTCFullYear()}`;
    const overdue = pagamentos.filter((item) => item.status === "ATRASADO");
    const currentMonthDue = pagamentos.filter((item) => item.referenceMonth === currentReference && item.status !== "PAGO");
    const receivedThisMonth = pagamentos.flatMap((item) => item.receipts || []).filter((receipt) => {
      const paidAt = new Date(receipt.paidAt);
      return paidAt.getUTCFullYear() === now.getUTCFullYear() && paidAt.getUTCMonth() === now.getUTCMonth();
    });
    return {
      recebido: receivedThisMonth.reduce((sum, receipt) => sum + (receipt.amountCents ?? Math.round(receipt.amount * 100)), 0) / 100,
      pendente: currentMonthDue.reduce((sum, item) => sum + Math.round(item.totalAmount * 100), 0) / 100,
      atraso: overdue.reduce((sum, item) => sum + Math.round(item.totalAmount * 100), 0) / 100,
    };
  }, [pagamentos]);

  const proprietariosDisponiveis = useMemo(() => {
    const associatedIds = new Set(imoveis.map((property) => property.ownerId).filter(Boolean));
    return proprietarios.filter((owner) => associatedIds.has(owner.id));
  }, [proprietarios, imoveis]);

  const imoveisDoProprietario = useMemo(
    () => imoveis.filter((property) => !ownerId || ownerId === "ALL" || property.ownerId === ownerId),
    [imoveis, ownerId],
  );

  async function confirmarBaixa(event) {
    event.preventDefault();
    if (!parcelaSelecionada) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const sourcePath = comprovante ? window.api.getPathForFile(comprovante) : undefined;
      const paidAt = new Date(`${dataPagamento}T12:00:00`).getTime();
      const amountCents = Math.round(Number(valorPagamento) * 100);
      const result = await window.api.payments.settleInstallment({
        rentalId: parcelaSelecionada.rentalId,
        referenceMonth: parcelaSelecionada.referenceMonth,
        paidAt,
        amountCents,
        receiptSourcePath: sourcePath,
        receiptName: comprovante?.name,
      });
      setUltimoRecebimentoId(result.payment.id);
      setParcelaSelecionada(null);
      setComprovante(null);
      setSucesso(result.message);
      await carregarDados();
    } catch (error) {
      setErro(error?.message || "Não foi possível registrar a baixa.");
    } finally {
      setSalvando(false);
    }
  }

  async function desfazerUltimoRecebimento() {
    if (!ultimoRecebimentoId || !window.confirm("Desfazer este recebimento? O saldo da parcela será recalculado.")) return;
    setErro("");
    try {
      await window.api.payments.undo(ultimoRecebimentoId);
      setUltimoRecebimentoId("");
      setSucesso("Recebimento desfeito. O histórico foi preservado.");
      await carregarDados();
    } catch (error) {
      setErro(error?.message || "Não foi possível desfazer o recebimento.");
    }
  }

  async function salvarRegras(event) {
    event.preventDefault();
    if (!rascunhoRegras) return;
    setSalvandoRegras(true);
    setErro("");
    try {
      const updated = await window.api.payments.updateSettings({
        graceDays: Number(rascunhoRegras.graceDays),
        fineRateBasisPoints: Math.round(Number(rascunhoRegras.finePercent) * 100),
        monthlyInterestBasisPoints: Math.round(Number(rascunhoRegras.interestPercent) * 100),
        adminFeeBasisPoints: Math.round(Number(rascunhoRegras.adminFeePercent) * 100),
      });
      setRegrasFinanceiras(updated);
      setSucesso("Regras financeiras atualizadas.");
      await carregarDados();
    } catch (error) {
      setErro(error?.message || "Não foi possível salvar as regras.");
    } finally {
      setSalvandoRegras(false);
    }
  }

  async function selecionarContratoRegras(contractId) {
    setContratoRegrasId(contractId);
    setRascunhoContratoRegras(null);
    if (!contractId) return;
    setErro("");
    try {
      const contractSettings = await window.api.payments.getContractSettings(contractId);
      const defaults = contractSettings || regrasFinanceiras;
      if (!defaults) throw new Error("As regras globais ainda não foram carregadas.");
      setRascunhoContratoRegras({
        useOwnRules: Boolean(contractSettings?.useOwnRules),
        graceDays: String(defaults.graceDays),
        finePercent: percentualParaCampo(defaults.fineRateBasisPoints),
        interestPercent: percentualParaCampo(defaults.monthlyInterestBasisPoints),
      });
    } catch (error) {
      setErro(error?.message || "Não foi possível carregar as regras do contrato.");
    }
  }

  async function salvarRegrasContrato(event) {
    event.preventDefault();
    if (!contratoRegrasId || !rascunhoContratoRegras) return;
    setSalvandoRegrasContrato(true);
    setErro("");
    try {
      await window.api.payments.updateContractSettings(contratoRegrasId, {
        useOwnRules: rascunhoContratoRegras.useOwnRules,
        graceDays: Number(rascunhoContratoRegras.graceDays),
        fineRateBasisPoints: Math.round(Number(rascunhoContratoRegras.finePercent) * 100),
        monthlyInterestBasisPoints: Math.round(Number(rascunhoContratoRegras.interestPercent) * 100),
      });
      setSucesso("Regras do contrato atualizadas.");
      await carregarDados();
    } catch (error) {
      setErro(error?.message || "Não foi possível salvar as regras do contrato.");
    } finally {
      setSalvandoRegrasContrato(false);
    }
  }

  async function adicionarItemMensal(event) {
    event.preventDefault();
    if (!contratoItem) {
      setErro("Selecione o contrato do lançamento.");
      return;
    }
    setSalvandoItem(true);
    setErro("");
    try {
      const contract = contratos.find((item) => item.id === contratoItem);
      if (!contract) throw new Error("O contrato selecionado não foi encontrado.");
      await window.api.payments.createInstallmentItem({
        contractId: contract.id,
        referenceMonth: `${competenciaItem.slice(5, 7)}/${competenciaItem.slice(0, 4)}`,
        category: categoriaItem,
        description: descricaoItem.trim() || categoriaItem,
        amountCents: Math.round(Number(valorItem) * 100),
      });
      setDescricaoItem("");
      setValorItem("");
      setSucesso("Lançamento mensal adicionado.");
      await carregarDados();
    } catch (error) {
      setErro(error?.message || "Não foi possível adicionar o lançamento.");
    } finally {
      setSalvandoItem(false);
    }
  }

  const parametrosRelatorio = () => ({
    ownerId: ownerId || "ALL",
    propertyIds: propertyReportAll ? imoveisDoProprietario.map((property) => property.id) : propertyReportIds,
    periodStart: reportStart,
    periodEnd: reportEnd,
    includeStatuses: reportStatuses,
  });

  async function gerarRelatorioFinanceiro() {
    setErro("");
    try {
      const report = await window.api.financialReports.preview(parametrosRelatorio());
      setFinancialReport(report);
    } catch (error) {
      setErro(error?.message || "Não foi possível pré-visualizar o relatório.");
    }
  }

  async function exportarRelatorioFinanceiro() {
    setErro("");
    try {
      const result = await window.api.financialReports.exportPdf(parametrosRelatorio());
      if (!result?.canceled) setSucesso(`Relatório salvo em ${result.filePath}`);
    } catch (error) {
      setErro(error?.message || "Não foi possível exportar o relatório.");
    }
  }

  function definirPeriodo(mode) {
    const now = new Date();
    const selectedMonth = mode === "PREVIOUS"
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : now;
    setReportPeriodMode(mode);
    if (mode !== "CUSTOM") {
      setReportStart(primeiroDiaDoMes(selectedMonth));
      setReportEnd(ultimoDiaDoMes(selectedMonth));
    }
    setFinancialReport(null);
  }

  async function abrirComprovante(paymentId) {
    setErro("");
    try {
      await window.api.payments.openReceipt(paymentId);
    } catch (error) {
      setErro(error?.message || "Não foi possível abrir o comprovante.");
    }
  }

  function imprimirInadimplencia() {
    setAba("ATRASADO");
    setMesFiltro("");
    requestAnimationFrame(() => window.print());
  }

  return (
    <div className="payments-screen">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .layout, .principal, .conteudo { height: auto !important; overflow: visible !important; }
          .payments-screen, .payments-screen * { visibility: visible; }
          .payments-screen { position: absolute; inset: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .payments-screen table { font-size: var(--font-body-sm); }
          .payments-screen thead { display: table-header-group; }
          .payments-screen tr { break-inside: avoid; }
        }
      `}</style>

      <header className="payments-header">
        <div>
          <h2 className="payments-title">Controle financeiro</h2>
          <p className="payments-subtitle">Parcelas de locação, baixas manuais e relatórios internos.</p>
        </div>
        <button onClick={imprimirInadimplencia} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large no-print">
          <Printer size={16} /> Imprimir inadimplência
        </button>
      </header>

      {erro && <div role="alert" className="payments-feedback payments-feedback--error">
        <span>{erro}</span><button type="button" onClick={carregarDados} className="payments-text-button">Tentar de novo</button>
      </div>}
      {sucesso && <div role="status" className="payments-feedback payments-feedback--success">
        <span>{sucesso}</span>
        {ultimoRecebimentoId && <button type="button" onClick={desfazerUltimoRecebimento} className="payments-text-button">Desfazer</button>}
      </div>}

      <section className="payments-summary-grid" aria-label="Resumo financeiro">
        <ResumoCard titulo="A receber no mês" valor={resumo.pendente} cor="amber" icone={<Wallet size={20} />} />
        <ResumoCard titulo="Em atraso (com encargos)" valor={resumo.atraso} cor="red" icone={<AlertTriangle size={20} />} />
        <ResumoCard titulo="Recebido no mês" valor={resumo.recebido} cor="emerald" icone={<CheckCircle2 size={20} />} />
      </section>

      <section className="payments-section no-print">
        <h3 className="payments-section-title">Relatórios e regras</h3>
        <div className="payments-reports-grid">
          <div className="payments-report-panel payments-report-panel--error">
            <h4 className="payments-report-title"><AlertTriangle size={17} /> Relatório de inadimplência</h4>
            <p className="payments-report-description">A tabela abaixo pode ser filtrada por atraso e impressa. Casos acima de 90 dias ficam destacados.</p>
            <button onClick={() => { setAba("ATRASADO"); setMesFiltro(""); }} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large">
              Exibir débitos em atraso
            </button>
          </div>
          <div className="payments-report-panel payments-report-panel--primary">
            <h4 className="payments-report-title"><FileText size={17} /> Relatório financeiro</h4>
            <div className="payments-report-controls">
              <label className="payments-form-label">1. Proprietário
                <select value={ownerId} onChange={(event) => { setOwnerId(event.target.value); setPropertyReportAll(true); setPropertyReportIds([]); setFinancialReport(null); }} className="payments-input" aria-label="Proprietário do relatório">
                  <option value="ALL">Todos os proprietários</option>
                  {proprietariosDisponiveis.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="payments-report-property-picker">
              <legend>2. Imóveis</legend>
              <label className="payments-checkbox-label">
                <input type="checkbox" checked={propertyReportAll} onChange={(event) => {
                  setPropertyReportAll(event.target.checked);
                  if (!event.target.checked) setPropertyReportIds(imoveisDoProprietario.map((property) => property.id));
                  setFinancialReport(null);
                }} />
                Todos os imóveis {ownerId === "ALL" ? "selecionados" : "do proprietário"}
              </label>
              {!propertyReportAll && <>
                <input value={reportPropertySearch} onChange={(event) => setReportPropertySearch(event.target.value)} className="payments-input" placeholder="Buscar imóvel" aria-label="Buscar imóvel no relatório" />
                <div className="payments-property-checklist">
                  {imoveisDoProprietario.filter((property) => `${property.title} ${property.address}`.toLocaleLowerCase("pt-BR").includes(reportPropertySearch.toLocaleLowerCase("pt-BR"))).map((property) => (
                    <label key={property.id} className="payments-checkbox-label">
                      <input type="checkbox" checked={propertyReportIds.includes(property.id)} onChange={(event) => {
                        setPropertyReportIds((current) => event.target.checked
                          ? [...new Set([...current, property.id])]
                          : current.filter((id) => id !== property.id));
                        setFinancialReport(null);
                      }} />
                      {property.title || property.address}
                    </label>
                  ))}
                </div>
              </>}
            </fieldset>
            <fieldset className="payments-report-period">
              <legend>3. Período</legend>
              <div className="payments-period-options">
                {[["CURRENT", "Mês atual"], ["PREVIOUS", "Mês anterior"], ["CUSTOM", "Personalizado"]].map(([mode, label]) => (
                  <button key={mode} type="button" aria-pressed={reportPeriodMode === mode} onClick={() => definirPeriodo(mode)} className={`payments-period-button${reportPeriodMode === mode ? " is-active" : ""}`}>{label}</button>
                ))}
              </div>
              {reportPeriodMode === "CUSTOM" && <div className="payments-report-controls">
                <label className="payments-form-label">De<input type="date" value={reportStart} onChange={(event) => { setReportStart(event.target.value); setFinancialReport(null); }} className="payments-input" required /></label>
                <label className="payments-form-label">Até<input type="date" value={reportEnd} onChange={(event) => { setReportEnd(event.target.value); setFinancialReport(null); }} className="payments-input" required /></label>
              </div>}
            </fieldset>
            <fieldset className="payments-report-statuses">
              <legend>4. Incluir no relatório</legend>
              {[["RECEBIDO", "Recebidos"], ["EM_ATRASO", "Em atraso"], ["A_VENCER", "A vencer"]].map(([status, label]) => (
                <label key={status} className="payments-checkbox-label">
                  <input type="checkbox" checked={reportStatuses.includes(status)} onChange={(event) => {
                    setReportStatuses((current) => event.target.checked
                      ? [...new Set([...current, status])]
                      : current.filter((item) => item !== status));
                    setFinancialReport(null);
                  }} />
                  {label}
                </label>
              ))}
            </fieldset>
            <div className="payments-report-actions">
              <button onClick={gerarRelatorioFinanceiro} className="payments-button payments-button--filled ui-action ui-action--primary ui-action--large">Pré-visualizar</button>
              {financialReport && <button onClick={exportarRelatorioFinanceiro} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large">Exportar PDF</button>}
            </div>
            {financialReport && <div className="payments-report-preview">
              <div className="payments-report-preview-title">{financialReport.ownerName} · {financialReport.periodStart} a {financialReport.periodEnd}</div>
              <div className="payments-report-preview-values">
                <span>Recebido: {moeda(financialReport.totals.receivedCents / 100)}</span>
                <span>Em atraso: {moeda(financialReport.totals.overdueCents / 100)}</span>
                <span>A vencer: {moeda(financialReport.totals.dueCents / 100)}</span>
              </div>
              <div className="payments-report-property-preview">{financialReport.properties.filter((property) => property.entries.length).map((property) => <div key={property.id}><strong>{property.title}</strong><span>{property.entries.length} lançamento(s) · {moeda(property.subtotalCents / 100)}</span></div>)}</div>
            </div>}
          </div>
        </div>
        <details className="payments-disclosure">
          <summary>Editar regras de atraso</summary>
          {rascunhoRegras && <form onSubmit={salvarRegras} className="payments-settings-form">
            <label className="payments-form-label">Carência (dias)<input type="number" min="0" max="3650" step="1" value={rascunhoRegras.graceDays} onChange={(event) => setRascunhoRegras({ ...rascunhoRegras, graceDays: event.target.value })} className="payments-input" required /></label>
            <label className="payments-form-label">Multa única (%)<input type="number" min="0" max="100" step="0.01" value={rascunhoRegras.finePercent} onChange={(event) => setRascunhoRegras({ ...rascunhoRegras, finePercent: event.target.value })} className="payments-input" required /></label>
            <label className="payments-form-label">Juros ao mês (%)<input type="number" min="0" max="100" step="0.01" value={rascunhoRegras.interestPercent} onChange={(event) => setRascunhoRegras({ ...rascunhoRegras, interestPercent: event.target.value })} className="payments-input" required /></label>
            <label className="payments-form-label">Taxa de administração (%)<input type="number" min="0" max="100" step="0.01" value={rascunhoRegras.adminFeePercent} onChange={(event) => setRascunhoRegras({ ...rascunhoRegras, adminFeePercent: event.target.value })} className="payments-input" required /></label>
            <p className="payments-settings-warning">Confirme as regras com seu contrato e um profissional (advogado/contador).</p>
            <button disabled={salvandoRegras} className="payments-button payments-button--filled ui-action ui-action--primary">{salvandoRegras ? "Salvando…" : "Salvar regras"}</button>
          </form>}
          <div className="payments-contract-rules">
            <label className="payments-form-label">Regras próprias para um contrato
              <select value={contratoRegrasId} onChange={(event) => selecionarContratoRegras(event.target.value)} className="payments-input">
                <option value="">Selecione um contrato</option>
                {contratos.filter((item) => item.status === "ACTIVE").map((contract) => {
                  const property = imoveis.find((item) => item.id === contract.propertyId);
                  const tenant = clientes.find((item) => item.id === contract.tenantId);
                  return <option key={contract.id} value={contract.id}>{tenant?.name || "Locatário"} — {property?.title || property?.address || "Imóvel"}</option>;
                })}
              </select>
            </label>
            {rascunhoContratoRegras && <form onSubmit={salvarRegrasContrato} className="payments-settings-form">
              <label className="payments-checkbox-label"><input type="checkbox" checked={rascunhoContratoRegras.useOwnRules} onChange={(event) => setRascunhoContratoRegras({ ...rascunhoContratoRegras, useOwnRules: event.target.checked })} /> Usar regras próprias neste contrato</label>
              <label className="payments-form-label">Carência (dias)<input type="number" min="0" max="3650" step="1" value={rascunhoContratoRegras.graceDays} onChange={(event) => setRascunhoContratoRegras({ ...rascunhoContratoRegras, graceDays: event.target.value })} className="payments-input" required disabled={!rascunhoContratoRegras.useOwnRules} /></label>
              <label className="payments-form-label">Multa (%)<input type="number" min="0" max="100" step="0.01" value={rascunhoContratoRegras.finePercent} onChange={(event) => setRascunhoContratoRegras({ ...rascunhoContratoRegras, finePercent: event.target.value })} className="payments-input" required disabled={!rascunhoContratoRegras.useOwnRules} /></label>
              <label className="payments-form-label">Juros ao mês (%)<input type="number" min="0" max="100" step="0.01" value={rascunhoContratoRegras.interestPercent} onChange={(event) => setRascunhoContratoRegras({ ...rascunhoContratoRegras, interestPercent: event.target.value })} className="payments-input" required disabled={!rascunhoContratoRegras.useOwnRules} /></label>
              <button disabled={salvandoRegrasContrato} className="payments-button payments-button--filled ui-action ui-action--primary">{salvandoRegrasContrato ? "Salvando…" : "Salvar regras do contrato"}</button>
            </form>}
          </div>
        </details>
        <details className="payments-disclosure">
          <summary>Adicionar IPTU, condomínio ou outras despesas do mês</summary>
          <form onSubmit={adicionarItemMensal} className="payments-settings-form">
            <label className="payments-form-label">Contrato
              <select value={contratoItem} onChange={(event) => setContratoItem(event.target.value)} className="payments-input" required>
                <option value="">Selecione</option>
                {contratos.filter((item) => item.status === "ACTIVE").map((contract) => {
                  const property = imoveis.find((item) => item.id === contract.propertyId);
                  const tenant = clientes.find((item) => item.id === contract.tenantId);
                  return <option key={contract.id} value={contract.id}>{tenant?.name || "Locatário"} — {property?.title || property?.address || "Imóvel"}</option>;
                })}
              </select>
            </label>
            <label className="payments-form-label">Competência<input type="month" value={competenciaItem} onChange={(event) => setCompetenciaItem(event.target.value)} className="payments-input" required /></label>
            <label className="payments-form-label">Tipo
              <select value={categoriaItem} onChange={(event) => setCategoriaItem(event.target.value)} className="payments-input">
                <option value="IPTU">IPTU</option><option value="CONDOMINIO">Condomínio</option><option value="AGUA">Água</option><option value="LUZ">Luz</option><option value="OUTRO">Outro</option>
              </select>
            </label>
            <label className="payments-form-label">Descrição<input value={descricaoItem} onChange={(event) => setDescricaoItem(event.target.value)} maxLength="180" className="payments-input" placeholder="Opcional" /></label>
            <label className="payments-form-label">Valor (R$)<input type="number" min="0.01" step="0.01" value={valorItem} onChange={(event) => setValorItem(event.target.value)} className="payments-input" required /></label>
            <button disabled={salvandoItem} className="payments-button payments-button--filled ui-action ui-action--primary">{salvandoItem ? "Salvando…" : "Adicionar lançamento"}</button>
          </form>
        </details>
      </section>

      <section className="payments-table-section">
        <div className="payments-tabs" role="tablist" aria-label="Situação dos aluguéis">
          {[["ATRASADO", "Em atraso"], ["PENDENTE", "A vencer"], ["PAGO", "Recebidos"], ["TODOS", "Todos"]].map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={aba === value} onClick={() => setAba(value)} className={`payments-tab${aba === value ? " is-active" : ""}`}>{label}</button>
          ))}
        </div>
        <div className="payments-filters no-print">
          <label className="payments-search">
            <Search size={18} aria-hidden="true" />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar locatário ou imóvel" className="payments-input" aria-label="Buscar por locatário ou imóvel" />
          </label>
          <select value={ownerFiltro} onChange={(event) => { setOwnerFiltro(event.target.value); setPropertyFiltro(""); }} className="payments-input payments-filter-select" aria-label="Filtrar por proprietário">
            <option value="">Todos os proprietários</option>
            {proprietariosDisponiveis.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
          <select value={propertyFiltro} onChange={(event) => setPropertyFiltro(event.target.value)} className="payments-input payments-filter-select" aria-label="Filtrar por imóvel">
            <option value="">Todos os imóveis</option>
            {imoveis.filter((property) => !ownerFiltro || property.ownerId === ownerFiltro).map((property) => <option key={property.id} value={property.id}>{property.title || property.address}</option>)}
          </select>
          <select value={tenantFiltro} onChange={(event) => setTenantFiltro(event.target.value)} className="payments-input payments-filter-select" aria-label="Filtrar por locatário">
            <option value="">Todos os locatários</option>
            {clientes.filter((client) => pagamentos.some((item) => item.tenantId === client.id)).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <input type="month" value={mesFiltro} onChange={(event) => setMesFiltro(event.target.value)} className="payments-input payments-filter-month" aria-label="Filtrar por competência" />
          {(tenantFiltro || propertyFiltro || ownerFiltro || mesFiltro) && <button onClick={() => { setTenantFiltro(""); setPropertyFiltro(""); setOwnerFiltro(""); setMesFiltro(""); }} className="ui-action ui-action--neutral">Limpar filtros</button>}
        </div>

        {loading ? <div className="payments-loading" role="status" aria-live="polite" aria-label="Carregando pagamentos">
          <span className="ui-skeleton" />
          <span className="ui-skeleton" />
          <span className="ui-skeleton" />
        </div> : filtrados.length === 0 ? (
          <div className="payments-empty">{aba === "ATRASADO" ? <>Nenhum aluguel em atraso 🎉<br /><span>Quando houver parcelas vencidas, elas aparecerão aqui.</span></> : "Nenhuma parcela encontrada para os filtros selecionados."}</div>
        ) : (
          <div className="payments-table-wrap">
            <table className="payments-table">
              <thead>
                <tr><th>Vencimento</th><th>Locatário / imóvel</th><th>Aluguel e despesas</th><th>Atraso</th><th>Saldo atualizado</th><th>Status</th><th className="no-print">Ação</th></tr>
              </thead>
              <tbody>
                {filtrados.map((item) => (
                  <tr key={item.id} className={item.daysOverdue > 90 ? "is-overdue" : ""}>
                    <td><div className="payments-cell-primary">{formatarData(item.dueDate)}</div><div className="payments-cell-secondary">Competência {item.referenceMonth}</div>{item.daysOverdue > 90 && <div className="payments-overdue-alert">Mais de 90 dias em atraso</div>}</td>
                    <td><Link className="payments-link" to={`/locatarios/${item.tenantId}`}>{item.tenantName}</Link><div><Link className="payments-cell-link" to={`/imoveis/${item.propertyId}`}>{item.propertyTitle}</Link></div></td>
                    <td><div className="payments-cell-primary">{moeda(item.amount)}</div>{item.installmentItems.map((extra) => <div key={extra.id} className="payments-cell-secondary">{extra.description}: {moeda(extra.amountCents / 100)}</div>)}</td>
                    <td>{item.daysOverdue > 0 ? `${item.daysOverdue} ${item.daysOverdue === 1 ? "dia" : "dias"}` : "—"}</td>
                    <td><div className="payments-cell-primary">{moeda(item.totalAmount)}</div>{item.status !== "PAGO" && (item.fineAmount > 0 || item.interestAmount > 0) && <div className="payments-cell-secondary">Multa {moeda(item.fineAmount)} · juros {moeda(item.interestAmount)}</div>}</td>
                    <td><span className={`payments-status payments-status--${item.status === "PAGO" ? "paid" : item.status === "ATRASADO" ? "overdue" : "pending"}`}>{item.status === "PAGO" ? "Recebido" : item.status === "ATRASADO" ? "Em atraso" : "A vencer"}</span></td>
                    <td className="no-print">
                      <button type="button" onClick={() => setDetalheSelecionado(item)} className="payments-text-button">Detalhes</button>
                      {item.status !== "PAGO" && <button onClick={() => { setParcelaSelecionada(item); setDataPagamento(agoraParaInput()); setValorPagamento(valorParaCampo(item.totalAmount * 100)); setComprovante(null); }} className="payments-button payments-button--success ui-action ui-action--positive">Marcar como pago</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {parcelaSelecionada && <div className="payments-modal-overlay no-print">
        <form onSubmit={confirmarBaixa} className="payments-modal" role="dialog" aria-modal="true" aria-labelledby="payments-modal-title">
          <div><h3 className="payments-modal-title" id="payments-modal-title">Marcar como pago</h3><p className="payments-modal-description">{parcelaSelecionada.tenantName} · competência {parcelaSelecionada.referenceMonth}</p></div>
          <div className="payments-modal-summary">
            <div>Aluguel e despesas: {moeda(parcelaSelecionada.amount)}</div>
            <div>Saldo principal: {moeda(parcelaSelecionada.principalOutstandingCents / 100)}</div>
            {parcelaSelecionada.fineAmount > 0 && <div>Multa: {moeda(parcelaSelecionada.fineAmount)}</div>}
            {parcelaSelecionada.interestAmount > 0 && <div>Juros: {moeda(parcelaSelecionada.interestAmount)}</div>}
            <div className="payments-modal-total">Total devido hoje: {moeda(parcelaSelecionada.totalAmount)}</div>
          </div>
          <label className="payments-form-label">Valor recebido (R$)<input type="number" min="0.01" max={parcelaSelecionada.totalAmount} step="0.01" value={valorPagamento} onChange={(event) => setValorPagamento(event.target.value)} required className="payments-input" /></label>
          <label className="payments-form-label">Data do pagamento<input type="date" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} required className="payments-input" /></label>
          <label className="payments-form-label">Comprovante (opcional)<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => setComprovante(event.target.files?.[0] || null)} className="payments-file-input" /><span className="payments-cell-secondary">PDF, PNG ou JPG.</span></label>
          <div className="payments-modal-actions">
            <button type="button" onClick={() => setParcelaSelecionada(null)} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large">Cancelar</button>
            <button disabled={salvando} type="submit" className="payments-button payments-button--success ui-action ui-action--positive ui-action--large">{salvando ? "Salvando…" : "Confirmar"}</button>
          </div>
        </form>
      </div>}
      {detalheSelecionado && <div className="payments-modal-overlay no-print" onClick={() => setDetalheSelecionado(null)}>
        <section className="payments-modal payments-details-modal" role="dialog" aria-modal="true" aria-labelledby="payments-details-title" onClick={(event) => event.stopPropagation()}>
          <div className="payments-details-heading">
            <div><h3 className="payments-modal-title" id="payments-details-title">Detalhes do aluguel</h3><p className="payments-modal-description">{detalheSelecionado.tenantName} · {detalheSelecionado.propertyTitle} · {detalheSelecionado.referenceMonth}</p></div>
            <button type="button" onClick={() => setDetalheSelecionado(null)} className="payments-icon-button" aria-label="Fechar detalhes"><X size={18} /></button>
          </div>
          <div className="payments-modal-summary">
            <div>Saldo principal: {moeda(detalheSelecionado.principalOutstandingCents / 100)}</div>
            <div>Multa atual: {moeda(detalheSelecionado.fineAmount)}</div>
            <div>Juros atuais: {moeda(detalheSelecionado.interestAmount)}</div>
            <div className="payments-modal-total">Total devido hoje: {moeda(detalheSelecionado.totalAmount)}</div>
          </div>
          <div>
            <h4 className="payments-section-title">Despesas do mês</h4>
            {detalheSelecionado.installmentItems.length === 0 ? <p className="payments-cell-secondary">Nenhuma despesa adicional.</p> : detalheSelecionado.installmentItems.map((item) => <p key={item.id} className="payments-detail-row">{item.description}: {moeda(item.amountCents / 100)}</p>)}
          </div>
          <div>
            <h4 className="payments-section-title">Recebimentos registrados</h4>
            {detalheSelecionado.receipts.length === 0 ? <p className="payments-cell-secondary">Ainda não há recebimentos.</p> : detalheSelecionado.receipts.map((receipt) => <div key={receipt.id} className="payments-detail-row">
              <span>{formatarData(receipt.paidAt)} · {moeda((receipt.amountCents ?? Math.round(receipt.amount * 100)) / 100)}</span>
              {receipt.receiptPath && <button type="button" onClick={() => abrirComprovante(receipt.id)} className="payments-receipt-button"><Receipt size={16} /> Comprovante</button>}
            </div>)}
          </div>
          <div className="payments-modal-actions">
            {detalheSelecionado.status !== "PAGO" && <button type="button" onClick={() => { setParcelaSelecionada(detalheSelecionado); setValorPagamento(valorParaCampo(detalheSelecionado.totalAmount * 100)); setDataPagamento(agoraParaInput()); setDetalheSelecionado(null); }} className="payments-button payments-button--success ui-action ui-action--positive">Marcar como pago</button>}
            <button type="button" onClick={() => setDetalheSelecionado(null)} className="payments-button payments-button--outlined ui-action ui-action--neutral">Fechar</button>
          </div>
        </section>
      </div>}
    </div>
  );
}

function ResumoCard({ titulo, valor, cor, icone }) {
  return <div className={`payments-summary-card payments-summary-card--${cor}`}><div className="payments-summary-heading"><span>{titulo}</span>{icone}</div><div className="payments-summary-value">{moeda(valor)}</div></div>;
}
