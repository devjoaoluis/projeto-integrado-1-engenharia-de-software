import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, BellRing, X } from "lucide-react";
import BotaoVoltar from "./components/BotaoVoltar";

const POR_PAGINA = 5;
const AZUL = "#2563eb";
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

function Avatar({ nome }) {
  const iniciais = nome
    ? nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "L";

  return (
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        backgroundColor: "#dbeafe",
        color: "#1e40af",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "13px",
        flexShrink: 0
      }}
    >
      {iniciais}
    </div>
  );
}

function Pilula({ status }) {
  const isEmDia = status === "Em dia";
  const isAtrasado = status === "Atrasado";

  const bg = isEmDia ? "#dcfce7" : isAtrasado ? "#fee2e2" : "#fef3c7";
  const color = isEmDia ? "#15803d" : isAtrasado ? "#b91c1c" : "#b45309";

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "20px" }}>
      <button
        onClick={() => onMudar(Math.max(1, paginaAtual - 1))}
        disabled={paginaAtual === 1}
        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: paginaAtual === 1 ? "not-allowed" : "pointer" }}
      >
        Anterior
      </button>
      <span style={{ fontSize: "14px", color: "#475569" }}>
        Página <strong>{paginaAtual}</strong> de {totalPaginas}
      </span>
      <button
        onClick={() => onMudar(Math.min(totalPaginas, paginaAtual + 1))}
        disabled={paginaAtual === totalPaginas}
        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: paginaAtual === totalPaginas ? "not-allowed" : "pointer" }}
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
        await window.api.rentals.terminate({ tenantId: locatario.id, notes: motivo });
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
      setFeedback({ type: "error", message: "Erro ao processar a rescisão no backend." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        background: "#ffffff", padding: "28px", borderRadius: "10px",
        width: "100%", maxWidth: "500px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
          Rescisão de Contrato: {locatario.nome}
        </h2>

        {feedback.message && (
          <div style={{
            padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px",
            backgroundColor: feedback.type === "error" ? "#fee2e2" : "#dcfce7",
            color: feedback.type === "error" ? "#991b1b" : "#166534"
          }}>
            {feedback.message}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "24px 0" }}>A processar...</p>
        ) : (
          <div>
            {temDebitos ? (
              <div style={{
                backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px",
                borderRadius: "6px", marginBottom: "16px", color: "#991b1b", fontSize: "13px",
                display: "flex", gap: "8px", alignItems: "flex-start"
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Atenção:</strong> Foram encontrados <strong>{pagamentos.length} pagamento(s) pendente(s)</strong> para este locatário.
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px",
                borderRadius: "6px", marginBottom: "16px", color: "#166534", fontSize: "13px",
                display: "flex", gap: "8px", alignItems: "center"
              }}>
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>Nenhum débito pendente encontrado. Imóvel apto para liberação.</span>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Motivo / Observações da Rescisão:
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Insira notas sobre a rescisão..."
                rows={3}
                style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={onClose}
                style={{ background: "#e2e8f0", color: "#334155", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRescisao}
                style={{
                  background: temDebitos ? "#d97706" : "#dc2626",
                  color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px",
                  fontWeight: "600", cursor: "pointer", fontSize: "14px"
                }}
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
  const [alertaAberto, setAlertaAberto] = useState(true);
  const [avisoDisparo, setAvisoDisparo] = useState("");
  const notificouSessaoRef = useRef(false);

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

  const inadimplentes = locatarios.filter((l) => l.status === "Atrasado");

  function dispararAlertaInadimplentes(listaAlvo = inadimplentes, manual = false) {
    if (!listaAlvo || listaAlvo.length === 0) return;

    const nomes = listaAlvo.map((l) => l.nome).filter(Boolean);
    const resumoNomes = nomes.slice(0, 3).join(", ") + (nomes.length > 3 ? ` e +${nomes.length - 3}` : "");

    setAlertaAberto(true);
    setAvisoDisparo(
      manual
        ? `Alerta de atraso disparado para ${listaAlvo.length} ${listaAlvo.length === 1 ? "locatário" : "locatários"}: ${resumoNomes}.`
        : ""
    );

    if (typeof Notification !== "undefined") {
      const enviar = () => {
        new Notification("Alerta de Inadimplência", {
          body: `${listaAlvo.length} ${listaAlvo.length === 1 ? "locatário em atraso" : "locatários em atraso"}: ${resumoNomes}`,
          tag: "alerta-inadimplentes",
        });
      };

      if (Notification.permission === "granted") {
        enviar();
      } else if (Notification.permission === "default" && manual) {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") enviar();
        });
      }
    }
  }

  useEffect(() => {
    if (!loading && inadimplentes.length > 0 && !notificouSessaoRef.current) {
      notificouSessaoRef.current = true;
      dispararAlertaInadimplentes(inadimplentes, false);
    }
  }, [loading, inadimplentes.length]);

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
    return <p style={{ padding: "24px", color: "#667085" }}>A carregar locatários...</p>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <BotaoVoltar destino="/home" texto="Voltar" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1d2939" }}>Locatários</h1>
        <button
          className={mostrarForm ? "botao-voltar-padrao" : "ui-button"}
          onClick={() => {
            if (mostrarForm) cancelarEdicao();
            else setMostrarForm(true);
          }}
          style={{ width: mostrarForm ? "auto" : "200px" }}
        >
          {mostrarForm ? "← Voltar" : "Novo locatário"}
        </button>
      </div>

      {inadimplentes.length > 0 && alertaAberto && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderLeft: "4px solid #dc2626",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            color: "#991b1b"
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: "2px", color: "#dc2626" }} />
            <div>
              <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
                Alerta de atraso: {inadimplentes.length}{" "}
                {inadimplentes.length === 1 ? "locatário inadimplente" : "locatários inadimplentes"}
              </div>
              <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
                {inadimplentes.map((l) => `${l.nome} (${l.imovel})`).join(" • ")}
              </div>
              {avisoDisparo && (
                <div style={{ fontSize: "12px", color: "#15803d", fontWeight: "600", marginTop: "6px" }}>
                  {avisoDisparo}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setRascunho((atual) => ({ ...atual, status: "Atrasado" }));
                    setFiltros((atual) => ({ ...atual, status: "Atrasado" }));
                    setPagina(1);
                  }}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Filtrar atrasados
                </button>
                <button
                  type="button"
                  onClick={() => dispararAlertaInadimplentes(inadimplentes, true)}
                  style={{
                    backgroundColor: "#fff",
                    color: "#991b1b",
                    border: "1px solid #fca5a5",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <BellRing size={13} /> Disparar alerta
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAlertaAberto(false)}
            aria-label="Fechar alerta de atraso"
            style={{
              background: "none",
              border: "none",
              color: "#991b1b",
              cursor: "pointer",
              padding: "2px",
              display: "flex"
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={salvar} style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#334155" }}>
            {editando ? "Editar locatário" : "Cadastrar novo locatário"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label className="ui-label ui-label-required">Nome completo</label>
              <input
                className="ui-control"
                type="text"
                value={form.nome}
                onChange={(e) => atualizarForm("nome", e.target.value)}
                required
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
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
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">Telefone</label>
              <input
                className="ui-control"
                type="text"
                value={form.telefone}
                onChange={(e) => atualizarForm("telefone", e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">E-mail</label>
              <input
                className="ui-control"
                type="email"
                value={form.email}
                onChange={(e) => atualizarForm("email", e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">Status</label>
              <select
                className="ui-control"
                value={form.status}
                onChange={(e) => atualizarForm("status", e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff" }}
              >
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
                <option value="Atrasado">Atrasado</option>
              </select>
            </div>
          </div>
          <button className="ui-button" type="submit">
            {editando ? "Salvar" : "Cadastrar"}
          </button>
        </form>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Procurar por nome, CPF, e-mail ou imóvel..."
          value={rascunho.busca}
          onChange={(e) => setRascunho({ ...rascunho, busca: e.target.value })}
          style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
        />
        <select
          value={rascunho.status}
          onChange={(e) => setRascunho({ ...rascunho, status: e.target.value })}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}
        >
          <option value="">Todos os status</option>
          <option value="Em dia">Em dia</option>
          <option value="Pendente">Pendente</option>
          <option value="Atrasado">Atrasado</option>
        </select>
        <button onClick={buscar} style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Buscar</button>
        <button onClick={limpar} style={{ padding: "10px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", cursor: "pointer" }}>Limpar</button>
      </div>

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "16px" }}>
        <div style={{ minWidth: "720px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUNAS,
              gap: "12px",
              padding: "0 16px 10px",
              fontSize: "12px",
              fontWeight: "600",
              color: AZUL,
              borderBottom: "1px solid #e2e8f0"
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
            <p style={{ color: "#667085", padding: "24px 16px", textAlign: "center" }}>
              Nenhum locatário encontrado. Ajuste a busca ou clique em "Novo locatário" para cadastrar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
              {visiveis.map((l, i) => (
                <div
                  key={l.id}
                  onClick={() => navigate(`/locatarios/${l.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLUNAS,
                    gap: "12px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: l.status === "Atrasado" ? "#fff5f5" : (i % 2 === 0 ? "#f8fafc" : "#ffffff"),
                    fontSize: "14px",
                    color: "#101828",
                    cursor: "pointer",
                    border: l.status === "Atrasado" ? "1px solid #fecaca" : "1px solid transparent",
                    transition: "border-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = l.status === "Atrasado" ? "#f87171" : "#cbd5e1"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = l.status === "Atrasado" ? "#fecaca" : "transparent"}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "500", color: "#2563eb" }}>
                    <Avatar nome={l.nome} />
                    {l.nome}
                  </span>
                  <span style={{ color: "#475569" }}>{l.imovel || "—"}</span>
                  <span style={{ color: "#475569" }}>{l.telefone || "—"}</span>
                  <span>
                    <Pilula status={l.status} />
                  </span>
                  <span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/locatarios/${l.id}`);
                      }}
                      style={{
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Dossiê
                    </button>
                  </span>
                  <span style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        editar(l);
                      }}
                      style={{ background: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", padding: "6px 8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocatarioParaRescindir(l);
                      }}
                      style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "6px", padding: "6px 8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
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