import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import BotaoVoltar from "../../../shared/common/components/BotaoVoltar";

const POR_PAGINA = 5;
const COLUNAS = "1.8fr 1.2fr 1fr 1fr 80px 240px";
const CHAVE_ATRASO_MANUAL = "locus_atrasos_manuais";

const formVazio = {
  nome: "",
  cpfCnpj: "",
  telefone: "",
  email: "",
  status: "Em dia"
};

function lerMapaAtrasoManual() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ATRASO_MANUAL) || "{}");
  } catch {
    return {};
  }
}

function gravarAtrasoManual(id, atrasado) {
  if (!id) return;
  const mapa = lerMapaAtrasoManual();
  if (atrasado) {
    mapa[String(id)] = true;
  } else {
    delete mapa[String(id)];
  }
  localStorage.setItem(CHAVE_ATRASO_MANUAL, JSON.stringify(mapa));
}

function locacaoEstaEmAtraso(aluguel, agora = new Date()) {
  if (!aluguel) return false;
  const statusLoc = String(aluguel.status || "").trim().toUpperCase();
  if (["TERMINATED", "CANCELLED", "CANCELED", "CLOSED", "INACTIVE"].includes(statusLoc)) {
    return false;
  }

  if (aluguel.initialPaymentsPaid === false) {
    return true;
  }

  const dueDay = Number(aluguel.dueDay);
  if (!Number.isNaN(dueDay) && dueDay >= 1 && dueDay <= 31) {
    const startMs = aluguel.startDate ? new Date(aluguel.startDate).getTime() : NaN;
    const jaIniciou = Number.isNaN(startMs) || startMs <= agora.getTime();
    if (jaIniciou && agora.getDate() > dueDay && aluguel.initialPaymentsPaid !== true) {
      return true;
    }
  }

  return false;
}

function Pilula({ status }) {
  const isEmDia = status === "Em dia";
  const isAtrasado = status === "Atrasado";

  const bg = isEmDia ? "var(--color-success-container)" : isAtrasado ? "var(--color-error-container)" : "var(--color-warning-container)";
  const color = isEmDia ? "var(--color-success)" : isAtrasado ? "var(--color-error)" : "var(--color-warning)";

  return (
    <span
      style={{
        padding: "var(--space-1) var(--space-2)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-body-sm)",
        fontWeight: "600",
        backgroundColor: bg,
        color: color,
        display: "inline-block"
      }}
    >
      {status || "Em dia"}
    </span>
  );
}

function Paginacao({ paginaAtual, totalPaginas, onMudar }) {
  if (totalPaginas <= 1) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
      <button
        className="ui-action ui-action--neutral"
        onClick={() => onMudar(Math.max(1, paginaAtual - 1))}
        disabled={paginaAtual === 1}
      >
        Anterior
      </button>
      <span style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)" }}>
        Página <strong>{paginaAtual}</strong> de {totalPaginas}
      </span>
      <button
        className="ui-action ui-action--neutral"
        onClick={() => onMudar(Math.min(totalPaginas, paginaAtual + 1))}
        disabled={paginaAtual === totalPaginas}
      >
        Seguinte
      </button>
    </div>
  );
}

function ModalRescisao({ locatario, onClose, onSucesso }) {
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState([]);
  const [temDebitos, setTemDebitos] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    verificarPagamentos();
  }, [locatario]);

  const verificarPagamentos = async () => {
    try {
      setLoading(true);

      // Prioriza obter o resumo financeiro estruturado via rentals:get-termination-summary se disponível
      if (window.api && window.api.rentals && typeof window.api.rentals.getTerminationSummary === "function") {
        try {
          const summary = await window.api.rentals.getTerminationSummary(locatario.id);
          if (summary) {
            setPagamentos(summary.pendingDebts || []);
            setTemDebitos(Boolean(summary.hasPendingDebts));
            return;
          }
        } catch {
          // Continua para a verificação em pagamentos
        }
      }

      const pagamentosRes = window.api && window.api.payments && typeof window.api.payments.list === "function"
        ? await window.api.payments.list()
        : [];

      const debitosPendentes = (pagamentosRes || []).filter(
        (p) => (String(p.clientId) === String(locatario.id) || String(p.tenantId) === String(locatario.id)) &&
               (p.status === "PENDENTE" || p.status === "ATRASADO" || p.status === "PENDING")
      );

      setPagamentos(debitosPendentes);
      setTemDebitos(debitosPendentes.length > 0);
    } catch (error) {
      console.error("Erro ao verificar pagamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarRescisao = async () => {
    try {
      setLoading(true);

      if (window.api && window.api.clients && typeof window.api.clients.terminateContract === "function") {
        await window.api.clients.terminateContract({
          clientId: locatario.id,
          notes: motivo,
          hasDebts: temDebitos
        });
      } else if (window.api && window.api.rentals && typeof window.api.rentals.terminate === "function") {
        await window.api.rentals.terminate({
          tenantId: locatario.id,
          notes: motivo,
          hasDebts: temDebitos
        });
      } else if (window.api && window.api.rentals && typeof window.api.rentals.cancel === "function") {
        await window.api.rentals.cancel(locatario.id, {
          notes: motivo,
          hasDebts: temDebitos
        });
      } else if (window.api && window.api.rentals && typeof window.api.rentals.update === "function") {
        const rentalsList = await window.api.rentals.list().catch(() => []);
        const activeRental = rentalsList.find(r => String(r.tenantId) === String(locatario.id) && (!r.status || r.status === "ACTIVE"));
        if (activeRental) {
          await window.api.rentals.update({ id: activeRental.id, status: "TERMINATED", notes: motivo });
        }
      }

      gravarAtrasoManual(locatario.id, false);
      window.dispatchEvent(new Event("locus:locatarios-atualizados"));

      setFeedback({ type: "success", message: "Contrato encerrado e locatário desassociado com sucesso!" });
      setTimeout(() => {
        onSucesso();
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Erro ao rescindir contrato:", error);
      const msg = error?.message || "Erro ao processar a rescisão no backend.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "var(--color-scrim)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
      fontFamily: "var(--font-family-base)"
    }}>
      <div style={{
        background: "var(--color-surface)", padding: "var(--space-5)", borderRadius: "var(--radius-md)",
        width: "100%", maxWidth: "500px", boxShadow: "var(--elevation-4)"
      }}>
        <h2 style={{ fontSize: "var(--font-title-lg)", fontWeight: "700", color: "var(--color-on-surface)", marginBottom: "var(--space-3)" }}>
          Rescisão de Contrato: {locatario.nome}
        </h2>

        {feedback.message && (
          <div style={{
            padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", fontSize: "var(--font-body-md)",
            backgroundColor: feedback.type === "error" ? "var(--color-error-container)" : "var(--color-success-container)",
            color: feedback.type === "error" ? "var(--color-error)" : "var(--color-success)"
          }}>
            {feedback.message}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--color-on-surface)", padding: "var(--space-5) 0" }}>A processar...</p>
        ) : (
          <div>
            {temDebitos ? (
              <div style={{
                backgroundColor: "var(--color-error-container)", border: "1px solid var(--color-error)", padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", color: "var(--color-error)", fontSize: "var(--font-body-md)",
                display: "flex", gap: "var(--space-2)", alignItems: "flex-start"
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "var(--space-1)" }} />
                <div>
                  <strong>Atenção:</strong> Foram encontrados <strong>{pagamentos.length} pagamento(s) pendente(s)</strong> para este locatário.
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: "var(--color-success-container)", border: "1px solid var(--color-success)", padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", color: "var(--color-success)", fontSize: "var(--font-body-md)",
                display: "flex", gap: "var(--space-2)", alignItems: "center"
              }}>
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>Nenhum débito pendente encontrado. Imóvel apto para liberação.</span>
              </div>
            )}

            <div style={{ marginBottom: "var(--space-4)" }}>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Motivo / Observações da Rescisão:
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Insira notas sobre a rescisão..."
                rows={3}
                style={{ width: "100%", padding: "var(--space-2)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button
                className="ui-action ui-action--neutral"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="ui-action ui-action--destructive"
                onClick={handleConfirmarRescisao}
              >
                {temDebitos ? "Prosseguir com Débitos e Rescindir" : "Confirmar Rescisão"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Locatarios() {
  const navigate = useNavigate();
  const [locatarios, setLocatarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rascunho, setRascunho] = useState({ busca: "", status: "" });
  const [filtros, setFiltros] = useState({ busca: "", status: "" });
  const [pagina, setPagina] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);
  const [locatarioParaRescindir, setLocatarioParaRescindir] = useState(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dados, alugueis, imoveis, pagamentos] = await Promise.all([
        window.api.clients.list(),
        window.api.rentals ? window.api.rentals.list().catch(() => []) : [],
        window.api.properties ? window.api.properties.list().catch(() => []) : [],
        window.api && window.api.payments && typeof window.api.payments.list === "function"
          ? window.api.payments.list().catch(() => [])
          : [],
      ]);

      const imovelPorId = {};
      (imoveis || []).forEach((im) => {
        imovelPorId[im.id] = im.title || im.address || `Imóvel #${String(im.id).slice(0, 5)}`;
      });

      const agora = new Date();
      const imovelPorCliente = {};
      const atrasoPorLocacaoCliente = {};
      (alugueis || []).forEach((aluguel) => {
        const idCli = aluguel.tenantId || aluguel.clientId;
        if (!idCli) return;
        const chaveCli = String(idCli);

        const statusLoc = String(aluguel.status || "").trim().toUpperCase();
        if (aluguel.propertyId && !["TERMINATED", "CANCELLED", "CANCELED", "CLOSED"].includes(statusLoc)) {
          imovelPorCliente[chaveCli] = imovelPorId[aluguel.propertyId] || "Imóvel associado";
        }

        if (locacaoEstaEmAtraso(aluguel, agora)) {
          atrasoPorLocacaoCliente[chaveCli] = true;
        }
      });

      const agoraMs = agora.getTime();
      const atrasosPorCliente = {};
      (pagamentos || []).forEach((p) => {
        const st = String(p.status || "").trim().toUpperCase();
        const rawVenc = p.dueDate ?? p.vencimento ?? p.dueAt;
        const vencMs = rawVenc ? new Date(rawVenc).getTime() : NaN;
        const vencidoPendente =
          ["PENDENTE", "PENDING", "EM_ABERTO"].includes(st) &&
          !Number.isNaN(vencMs) &&
          vencMs < agoraMs;

        if (["ATRASADO", "OVERDUE"].includes(st) || vencidoPendente) {
          const idCli = p.clientId || p.tenantId;
          if (idCli) {
            atrasosPorCliente[String(idCli)] = (atrasosPorCliente[String(idCli)] || 0) + 1;
          }
        }
      });

      const mapaManual = lerMapaAtrasoManual();

      const formatados = (dados || []).map((l) => {
        const atrasadoStatus = ["atrasado", "overdue"].includes(
          String(l.status || "").trim().toLowerCase()
        );
        const temPagamentoAtrasado = (atrasosPorCliente[String(l.id)] || 0) > 0;
        const temLocacaoAtrasada = Boolean(atrasoPorLocacaoCliente[String(l.id)]);
        const atrasoManual = Boolean(mapaManual[String(l.id)]);
        const statusFinal =
          atrasadoStatus || temPagamentoAtrasado || temLocacaoAtrasada || atrasoManual
            ? "Atrasado"
            : (l.status || "Em dia");

        return {
          ...l,
          nome: l.name || l.nome,
          telefone: l.phone || l.telefone,
          cpf: l.cpfCnpj || l.cpf,
          imovel: imovelPorCliente[String(l.id)] || l.imovel || l.property || "—",
          status: statusFinal,
          qtdPagamentosAtrasados: atrasosPorCliente[String(l.id)] || 0
        };
      });
      setLocatarios(formatados);
    } catch (err) {
      console.error("Erro ao carregar locatários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const filtrados = locatarios.filter((l) => {
    const nome = l.nome || "";
    const cpf = l.cpf || "";
    const email = l.email || "";
    const imovel = l.imovel || "";

    const texto = `${nome} ${cpf} ${email} ${imovel}`.toLowerCase();
    const bateBusca = texto.includes(filtros.busca.toLowerCase());
    const bateStatus = !filtros.status || l.status === filtros.status;
    return bateBusca && bateStatus;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function buscar() {
    setFiltros(rascunho);
    setPagina(1);
  }

  function limpar() {
    const vazio = { busca: "", status: "" };
    setRascunho(vazio);
    setFiltros(vazio);
    setPagina(1);
  }

  function atualizarForm(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();

    const documentoDigitado = form.cpfCnpj || "";
    const documentoLimpo = documentoDigitado.replace(/\D/g, "");
    const telefoneValor = form.telefone || "";

    if (!form.nome || !form.nome.trim()) {
      alert("Por favor, preencha o Nome completo.");
      return;
    }

    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
      alert(`O CPF/CNPJ deve conter exatamente 11 ou 14 dígitos. O valor atual tem ${documentoLimpo.length} dígitos.`);
      return;
    }

    try {
      const dadosParaEnviar = {
        name: form.nome.trim(),
        cpfCnpj: documentoLimpo,
        phone: telefoneValor.trim(),
        email: form.email ? form.email.trim() : null,
        type: "TENANT",
        status: form.status || "Em dia"
      };

      const respostaServidor = editando
        ? await window.api.clients.update({ id: editando, ...dadosParaEnviar })
        : await window.api.clients.create(dadosParaEnviar);

      const idAlvo = respostaServidor?.id || editando;
      const atrasoManual = form.status === "Atrasado";
      gravarAtrasoManual(idAlvo, atrasoManual);

      const anterior = locatarios.find((item) => String(item.id) === String(idAlvo));
      const novoLocatario = {
        ...anterior,
        ...respostaServidor,
        id: idAlvo,
        nome: respostaServidor?.name || respostaServidor?.nome || form.nome.trim(),
        telefone: respostaServidor?.phone || respostaServidor?.telefone || telefoneValor.trim(),
        cpf: respostaServidor?.cpfCnpj || respostaServidor?.cpf || documentoLimpo,
        imovel: anterior?.imovel || respostaServidor?.imovel || respostaServidor?.property || "—",
        status: atrasoManual ? "Atrasado" : (form.status || "Em dia")
      };

      setLocatarios((atual) => editando
        ? atual.map((locatario) => String(locatario.id) === String(idAlvo) ? novoLocatario : locatario)
        : [novoLocatario, ...atual]);
      setForm(formVazio);
      setEditando(null);
      setMostrarForm(false);
      setPagina(1);
      if (atrasoManual) setAlertaAberto(true);

      window.dispatchEvent(new Event("locus:locatarios-atualizados"));
    } catch (err) {
      console.error("Erro detalhado ao salvar locatário:", err);
      alert("Erro ao salvar o locatário na base de dados. Verifique o console (F12).");
    }
  }

  function editar(locatario) {
    setEditando(locatario.id);
    setForm({
      nome: locatario.nome || locatario.name || "",
      cpfCnpj: locatario.cpf || locatario.cpfCnpj || "",
      telefone: locatario.telefone || locatario.phone || "",
      email: locatario.email || "",
      status: locatario.status || "Em dia",
    });
    setMostrarForm(true);
  }

  function cancelarEdicao() {
    setEditando(null);
    setForm(formVazio);
    setMostrarForm(false);
  }

  if (loading) {
    return <p style={{ padding: "var(--space-5)", color: "var(--color-on-surface-variant)" }}>A carregar locatários...</p>;
  }

  return (
    <div style={{ padding: "var(--space-5)", maxWidth: "1200px", margin: "0 auto" }}>
      <BotaoVoltar destino="/home" texto="Voltar" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <h1 style={{ fontSize: "var(--font-headline-md)", fontWeight: "bold", color: "var(--color-on-surface)" }}>Locatários</h1>
        <button
          className={mostrarForm
            ? "ui-action ui-action--neutral ui-action--large"
            : "ui-action ui-action--primary ui-action--large"}
          onClick={() => {
            if (mostrarForm) cancelarEdicao();
            else setMostrarForm(true);
          }}
        >
          {mostrarForm ? "← Voltar" : "Novo locatário"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={salvar} style={{ background: "var(--color-primary-container)", padding: "var(--space-4)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-5)", border: "1px solid var(--color-outline-variant)" }}>
          <h2 style={{ fontSize: "var(--font-title-lg)", marginBottom: "var(--space-4)", color: "var(--color-on-surface)" }}>
            {editando ? "Editar locatário" : "Cadastrar novo locatário"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div>
              <label className="ui-label ui-label-required">Nome completo</label>
              <input
                className="ui-control"
                type="text"
                value={form.nome}
                onChange={(e) => atualizarForm("nome", e.target.value)}
                required
                style={{ width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-outline-variant)" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-required">CPF/CNPJ</label>
              <input
                className="ui-control"
                type="text"
                placeholder="Ex: 12345678901"
                value={form.cpfCnpj}
                onChange={(e) => atualizarForm("cpfCnpj", e.target.value)}
                required
                style={{ width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-outline-variant)" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">Telefone</label>
              <input
                className="ui-control"
                type="text"
                value={form.telefone}
                onChange={(e) => atualizarForm("telefone", e.target.value)}
                style={{ width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-outline-variant)" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">E-mail</label>
              <input
                className="ui-control"
                type="email"
                value={form.email}
                onChange={(e) => atualizarForm("email", e.target.value)}
                style={{ width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-outline-variant)" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">Status</label>
              <select
                className="ui-control"
                value={form.status}
                onChange={(e) => atualizarForm("status", e.target.value)}
                style={{ width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-outline-variant)", background: "var(--color-surface)" }}
              >
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
                <option value="Atrasado">Atrasado</option>
              </select>
            </div>
          </div>
          <button className="ui-action ui-action--primary ui-action--large" type="submit">
            {editando ? "Salvar" : "Cadastrar"}
          </button>
        </form>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <input
          type="text"
          placeholder="Procurar por nome, CPF, e-mail ou imóvel..."
          value={rascunho.busca}
          onChange={(e) => setRascunho({ ...rascunho, busca: e.target.value })}
          style={{ flex: 1, padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-outline-variant)" }}
        />
        <select
          value={rascunho.status}
          onChange={(e) => setRascunho({ ...rascunho, status: e.target.value })}
          style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-outline-variant)", background: "var(--color-surface)" }}
        >
          <option value="">Todos os status</option>
          <option value="Em dia">Em dia</option>
          <option value="Pendente">Pendente</option>
          <option value="Atrasado">Atrasado</option>
        </select>
        <button className="ui-action ui-action--primary" onClick={buscar}>Buscar</button>
        <button className="ui-action ui-action--neutral" onClick={limpar}>Limpar</button>
      </div>

      <div style={{ overflowX: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-outline-variant)", padding: "var(--space-4)" }}>
        <div style={{ minWidth: "720px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUNAS,
              gap: "var(--space-3)",
              padding: "0 var(--space-4) var(--space-2)",
              fontSize: "var(--font-body-sm)",
              fontWeight: "600",
              color: "var(--color-on-surface)",
              borderBottom: "1px solid var(--color-outline-variant)"
            }}
          >
            <span>Locatário</span>
            <span>Imóvel</span>
            <span>Telefone</span>
            <span>Status</span>
            <span>Dossiê</span>
            <span>Ações</span>
          </div>

          {visiveis.length === 0 ? (
            <p style={{ color: "var(--color-on-surface-variant)", padding: "var(--space-5) var(--space-4)", textAlign: "center" }}>
              Nenhum locatário encontrado. Ajuste a busca ou clique em "Novo locatário" para cadastrar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginTop: "var(--space-2)" }}>
              {visiveis.map((l, i) => (
                <div
                  key={l.id}
                  onClick={() => navigate(`/locatarios/${l.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLUNAS,
                    gap: "var(--space-3)",
                    alignItems: "center",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: l.status === "Atrasado" ? "var(--color-error-container)" : (i % 2 === 0 ? "var(--color-primary-container)" : "var(--color-on-surface-variant)"),
                    fontSize: "var(--font-body-md)",
                    color: "var(--color-on-surface)",
                    cursor: "pointer",
                    border: l.status === "Atrasado" ? "1px solid var(--color-error)" : "1px solid transparent",
                    transition: "border-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = l.status === "Atrasado" ? "var(--color-error)" : "var(--color-primary-container)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = l.status === "Atrasado" ? "var(--color-error-container)" : "transparent"}
                >
                  <span style={{ fontWeight: "500", color: "var(--color-on-surface)" }}>
                    {l.nome}
                  </span>
                  <span style={{ color: "var(--color-on-surface)" }}>{l.imovel || "—"}</span>
                  <span style={{ color: "var(--color-on-surface)" }}>{l.telefone || "—"}</span>
                  <span>
                    <Pilula status={l.status} />
                  </span>
                  <span>
                    <button
                      className="ui-action ui-action--neutral"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/locatarios/${l.id}`);
                      }}
                    >
                      Dossiê
                    </button>
                  </span>
                  <span style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
                    <button
                      className="ui-action ui-action--primary"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        editar(l);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="ui-action ui-action--destructive"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocatarioParaRescindir(l);
                      }}
                      title="Encerrar Contrato / Quebra de Contrato"
                    >
                      Rescindir
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Paginacao paginaAtual={paginaAtual} totalPaginas={totalPaginas} onMudar={setPagina} />

      {locatarioParaRescindir && (
        <ModalRescisao
          locatario={locatarioParaRescindir}
          onClose={() => setLocatarioParaRescindir(null)}
          onSucesso={() => {
            carregarDados();
          }}
        />
      )}
    </div>
  );
}