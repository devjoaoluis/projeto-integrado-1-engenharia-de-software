import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileText, Printer, Receipt, Search, Wallet } from "lucide-react";

const moeda = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarData = (timestamp) => timestamp ? new Date(timestamp).toLocaleDateString("pt-BR") : "—";
const agoraParaInput = () => {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
};

export default function Pagamentos() {
  const [searchParams] = useSearchParams();
  const [pagamentos, setPagamentos] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [mesFiltro, setMesFiltro] = useState("");
  const [tenantFiltro, setTenantFiltro] = useState(searchParams.get("tenantId") || "");
  const [propertyFiltro, setPropertyFiltro] = useState(searchParams.get("propertyId") || "");
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  const [dataPagamento, setDataPagamento] = useState(agoraParaInput());
  const [comprovante, setComprovante] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [propertyReportId, setPropertyReportId] = useState("");
  const [mesRepasse, setMesRepasse] = useState(new Date().toISOString().slice(0, 7));
  const [relatorioRepasse, setRelatorioRepasse] = useState(null);

  useEffect(() => {
    setTenantFiltro(searchParams.get("tenantId") || "");
    setPropertyFiltro(searchParams.get("propertyId") || "");
  }, [searchParams]);

  async function carregarDados() {
    setLoading(true);
    setErro("");
    try {
      const [items, properties, owners] = await Promise.all([
        window.api.payments.list(),
        window.api.properties.list(),
        window.api.owners.list(),
      ]);
      setPagamentos(items || []);
      setImoveis(properties || []);
      setProprietarios(owners || []);
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
      if (statusFiltro !== "TODOS" && item.status !== statusFiltro) return false;
      if (referenciaFiltro && item.referenceMonth !== referenciaFiltro) return false;
      return !texto || `${item.tenantName} ${item.propertyTitle}`.toLocaleLowerCase("pt-BR").includes(texto);
    });
  }, [pagamentos, busca, statusFiltro, mesFiltro, tenantFiltro, propertyFiltro]);

  const resumo = useMemo(() => {
    const now = new Date();
    const thisMonth = pagamentos.filter((item) => {
      if (item.status !== "PAGO" || !item.paidAt) return false;
      const paidAt = new Date(item.paidAt);
      return paidAt.getFullYear() === now.getFullYear() && paidAt.getMonth() === now.getMonth();
    });
    const pending = pagamentos.filter((item) => item.status === "PENDENTE");
    const overdue = pagamentos.filter((item) => item.status === "ATRASADO");
    return {
      recebido: thisMonth.reduce((sum, item) => sum + item.amount, 0),
      pendente: pending.reduce((sum, item) => sum + item.totalAmount, 0),
      atraso: overdue.reduce((sum, item) => sum + item.totalAmount, 0),
    };
  }, [pagamentos]);

  const proprietariosDisponiveis = useMemo(() => {
    const associatedIds = new Set(imoveis.map((property) => property.ownerId).filter(Boolean));
    return proprietarios.filter((owner) => associatedIds.has(owner.id));
  }, [proprietarios, imoveis]);

  const imoveisDoProprietario = useMemo(
    () => imoveis.filter((property) => !ownerId || property.ownerId === ownerId),
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
      await window.api.payments.settleInstallment({
        rentalId: parcelaSelecionada.rentalId,
        referenceMonth: parcelaSelecionada.referenceMonth,
        paidAt: new Date(dataPagamento).getTime(),
        receiptSourcePath: sourcePath,
        receiptName: comprovante?.name,
      });
      setParcelaSelecionada(null);
      setComprovante(null);
      setSucesso("Baixa manual registrada.");
      await carregarDados();
    } catch (error) {
      setErro(error?.message || "Não foi possível registrar a baixa.");
    } finally {
      setSalvando(false);
    }
  }

  async function gerarRelatorioRepasse() {
    if (!ownerId) {
      setErro("Selecione um proprietário para gerar o relatório de repasse.");
      return;
    }
    setErro("");
    try {
      const report = await window.api.repasses.getReport({
        ownerId,
        propertyId: propertyReportId || undefined,
        referenceMonth: mesRepasse,
      });
      setRelatorioRepasse(report);
    } catch (error) {
      setErro(error?.message || "Não foi possível gerar o relatório de repasse.");
    }
  }

  async function exportarRelatorioRepasse() {
    if (!ownerId) return;
    setErro("");
    try {
      const result = await window.api.repasses.exportPdf({
        ownerId,
        propertyId: propertyReportId || undefined,
        referenceMonth: mesRepasse,
      });
      if (!result?.canceled) setSucesso(`Relatório salvo em ${result.filePath}`);
    } catch (error) {
      setErro(error?.message || "Não foi possível exportar o relatório.");
    }
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
    setStatusFiltro("ATRASADO");
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

      {erro && <div role="alert" className="payments-feedback payments-feedback--error">{erro}</div>}
      {sucesso && <div role="status" className="payments-feedback payments-feedback--success">{sucesso}</div>}

      <section className="payments-summary-grid" aria-label="Resumo financeiro">
        <ResumoCard titulo="Recebido no mês" valor={resumo.recebido} cor="emerald" icone={<CheckCircle2 size={20} />} />
        <ResumoCard titulo="Total pendente" valor={resumo.pendente} cor="amber" icone={<Wallet size={20} />} />
        <ResumoCard titulo="Total em atraso" valor={resumo.atraso} cor="red" icone={<AlertTriangle size={20} />} />
      </section>

      <section className="payments-section no-print">
        <h3 className="payments-section-title">Relatórios</h3>
        <div className="payments-reports-grid">
          <div className="payments-report-panel payments-report-panel--error">
            <h4 className="payments-report-title"><AlertTriangle size={17} /> Relatório de inadimplência</h4>
            <p className="payments-report-description">A tabela abaixo pode ser filtrada por atraso e impressa. Casos acima de 90 dias ficam destacados.</p>
            <button onClick={() => { setStatusFiltro("ATRASADO"); setMesFiltro(""); }} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large">
              Exibir débitos em atraso
            </button>
          </div>
          <div className="payments-report-panel payments-report-panel--primary">
            <h4 className="payments-report-title"><FileText size={17} /> Repasse ao proprietário</h4>
            <div className="payments-report-controls">
              <select value={ownerId} onChange={(event) => { setOwnerId(event.target.value); setPropertyReportId(""); setRelatorioRepasse(null); }} className="payments-input" aria-label="Proprietário">
                <option value="">Selecione proprietário</option>
                {proprietariosDisponiveis.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
              </select>
              <select value={propertyReportId} onChange={(event) => setPropertyReportId(event.target.value)} className="payments-input" aria-label="Imóvel do relatório">
                <option value="">Todos os imóveis</option>
                {imoveisDoProprietario.map((property) => <option key={property.id} value={property.id}>{property.title || property.address}</option>)}
              </select>
              <input type="month" value={mesRepasse} onChange={(event) => { setMesRepasse(event.target.value); setRelatorioRepasse(null); }} className="payments-input" aria-label="Mês de repasse" />
            </div>
            <div className="payments-report-actions">
              <button onClick={gerarRelatorioRepasse} className="payments-button payments-button--filled ui-action ui-action--primary ui-action--large">Pré-visualizar</button>
              {relatorioRepasse && <button onClick={exportarRelatorioRepasse} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large">Exportar PDF</button>}
            </div>
            {relatorioRepasse && <div className="payments-report-preview">
              <div className="payments-report-preview-title">{relatorioRepasse.owner.name} · {relatorioRepasse.referenceMonth}</div>
              <div className="payments-report-preview-values">
                <span>Recebido: {moeda(relatorioRepasse.totalGrossAmount)}</span>
                <span>Taxa: −{moeda(relatorioRepasse.totalAdminFeeAmount)}</span>
                <span className="payments-report-net">Líquido: {moeda(relatorioRepasse.totalNetAmount)}</span>
              </div>
            </div>}
          </div>
        </div>
      </section>

      <section className="payments-table-section">
        <div className="payments-filters no-print">
          <label className="payments-search">
            <Search size={18} aria-hidden="true" />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar locatário ou imóvel" className="payments-input" aria-label="Buscar por locatário ou imóvel" />
          </label>
          <select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)} className="payments-input payments-filter-select" aria-label="Filtrar por status">
            <option value="TODOS">Todos os status</option>
            <option value="PAGO">Pago</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADO">Atrasado</option>
          </select>
          <input type="month" value={mesFiltro} onChange={(event) => setMesFiltro(event.target.value)} className="payments-input payments-filter-month" aria-label="Filtrar por competência" />
          {(tenantFiltro || propertyFiltro) && <button onClick={() => { setTenantFiltro(""); setPropertyFiltro(""); }} className="ui-action ui-action--neutral">Limpar vínculo</button>}
        </div>

        {loading ? <div className="payments-loading" role="status" aria-live="polite" aria-label="Carregando pagamentos">
          <span className="ui-skeleton" />
          <span className="ui-skeleton" />
          <span className="ui-skeleton" />
        </div> : filtrados.length === 0 ? (
          <div className="payments-empty">Nenhuma parcela encontrada para os filtros selecionados.</div>
        ) : (
          <div className="payments-table-wrap">
            <table className="payments-table">
              <thead>
                <tr><th>Competência / vencimento</th><th>Locatário / imóvel</th><th>Valor</th><th>Status</th><th>Pagamento / comprovante</th><th className="no-print">Ação</th></tr>
              </thead>
              <tbody>
                {filtrados.map((item) => (
                  <tr key={item.id} className={item.daysOverdue > 90 ? "is-overdue" : ""}>
                    <td><div className="payments-cell-primary">{item.referenceMonth}</div><div className="payments-cell-secondary">Vencimento: {formatarData(item.dueDate)}</div>{item.daysOverdue > 90 && <div className="payments-overdue-alert">Mais de 90 dias em atraso</div>}</td>
                    <td><Link className="payments-link" to={`/locatarios/${item.tenantId}`}>{item.tenantName}</Link><div><Link className="payments-cell-link" to={`/imoveis/${item.propertyId}`}>{item.propertyTitle}</Link></div></td>
                    <td><div className="payments-cell-primary">{moeda(item.status === "PAGO" ? item.amount : item.totalAmount)}</div>{item.status !== "PAGO" && (item.fineAmount > 0 || item.interestAmount > 0) && <div className="payments-cell-secondary">Multa {moeda(item.fineAmount)} · Juros {moeda(item.interestAmount)}</div>}</td>
                    <td><span className={`payments-status payments-status--${item.status === "PAGO" ? "paid" : item.status === "ATRASADO" ? "overdue" : "pending"}`}>{item.status === "PAGO" ? "Pago" : item.status === "ATRASADO" ? `Atrasado · ${item.daysOverdue}d` : "Pendente"}</span></td>
                    <td>{item.paidAt ? <div>{formatarData(item.paidAt)}</div> : <span className="payments-cell-secondary">—</span>}{item.receiptPath && <button onClick={() => abrirComprovante(item.id)} className="payments-receipt-button ui-action ui-action--neutral"><Receipt size={16} aria-hidden="true" /> Comprovante</button>}</td>
                    <td className="no-print">{item.status !== "PAGO" && <button onClick={() => { setParcelaSelecionada(item); setDataPagamento(agoraParaInput()); setComprovante(null); }} className="payments-button payments-button--success ui-action ui-action--positive">Registrar baixa</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {parcelaSelecionada && <div className="payments-modal-overlay no-print">
        <form onSubmit={confirmarBaixa} className="payments-modal" role="dialog" aria-modal="true" aria-labelledby="payments-modal-title">
          <div><h3 className="payments-modal-title" id="payments-modal-title">Registrar baixa manual</h3><p className="payments-modal-description">{parcelaSelecionada.tenantName} · competência {parcelaSelecionada.referenceMonth}</p></div>
          <div className="payments-modal-summary"><div>Aluguel: {moeda(parcelaSelecionada.amount)}</div><div>Multa: {moeda(parcelaSelecionada.fineAmount)}</div><div>Juros: {moeda(parcelaSelecionada.interestAmount)}</div><div className="payments-modal-total">Total registrado: {moeda(parcelaSelecionada.totalAmount)}</div></div>
          <label className="payments-form-label">Data do pagamento<input type="datetime-local" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} required className="payments-input" /></label>
          <label className="payments-form-label">Comprovante (opcional)<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => setComprovante(event.target.files?.[0] || null)} className="payments-file-input" /><span className="payments-cell-secondary">PDF, PNG ou JPG.</span></label>
          <div className="payments-modal-actions">
            <button type="button" onClick={() => setParcelaSelecionada(null)} className="payments-button payments-button--outlined ui-action ui-action--neutral ui-action--large">Cancelar</button>
            <button disabled={salvando} type="submit" className="payments-button payments-button--success ui-action ui-action--positive ui-action--large">{salvando ? "Salvando…" : "Confirmar baixa"}</button>
          </div>
        </form>
      </div>}
    </div>
  );
}

function ResumoCard({ titulo, valor, cor, icone }) {
  return <div className={`payments-summary-card payments-summary-card--${cor}`}><div className="payments-summary-heading"><span>{titulo}</span>{icone}</div><div className="payments-summary-value">{moeda(valor)}</div></div>;
}
