import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";

export const AgendamentoVisitas = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedVisitId = searchParams.get("visitId");
  const [visitas, setVisitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [modalFeedback, setModalFeedback] = useState({ type: "", message: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [clientId, setClientId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(30);
  const [status, setStatus] = useState("AGENDADA");
  const [notes, setNotes] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    if (!requestedVisitId || loading) return;
    const visit = visitas.find((item) => String(item.id) === requestedVisitId);
    if (!visit) return;
    setCurrentDate(new Date(Number(visit.scheduledAt)));
    window.requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll("[data-visit-id]"))
        .find((element) => element.dataset.visitId === requestedVisitId);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [requestedVisitId, loading, visitas]);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      
      const visitasRes = window.api && window.api.visits && typeof window.api.visits.list === "function" 
        ? await window.api.visits.list() 
        : [];

      const clientesRes = window.api && window.api.clients && typeof window.api.clients.list === "function" 
        ? await window.api.clients.list() 
        : [];

      const imoveisRes = window.api && window.api.properties && typeof window.api.properties.list === "function" 
        ? await window.api.properties.list() 
        : [];

      setVisitas(visitasRes || []);
      setClientes(clientesRes || []);
      setImoveis(imoveisRes || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setEditingId(null);
    setPropertyId("");
    setClientId("");
    setScheduledDate("");
    setScheduledTime("");
    setReminderLeadMinutes(30);
    setStatus("AGENDADA");
    setNotes("");
    setModalFeedback({ type: "", message: "" });
  };

  const handleAbrirNovoAgendamento = (dataPreenchida = "") => {
    limparFormulario();
    if (typeof dataPreenchida === "string" && dataPreenchida) {
      setScheduledDate(dataPreenchida);
    }
    setIsModalOpen(true);
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    limparFormulario();
  };

  const handleSalvarVisita = async (e) => {
    e.preventDefault();
    setModalFeedback({ type: "", message: "" });

    if (!propertyId || !clientId || !scheduledDate || !scheduledTime) {
      setModalFeedback({ type: "error", message: "Por favor, preencha todos os campos obrigatórios." });
      return;
    }

    try {
      const scheduledAt = Number(new Date(`${scheduledDate}T${scheduledTime}:00`).getTime());
      const conflict = visitas.find((visita) =>
        visita.id !== editingId &&
        visita.status === "AGENDADA" &&
        Number(visita.scheduledAt) === scheduledAt
      );
      if (conflict) {
        const conflictTime = new Date(Number(conflict.scheduledAt)).toLocaleString("pt-BR");
        setModalFeedback({
          type: "error",
          message: `Horário ocupado: ${obterNomeCliente(conflict.clientId)} já tem uma visita para "${obterNomeImovel(conflict.propertyId)}" em ${conflictTime}.`,
        });
        return;
      }

      if (editingId) {
        if (window.api && window.api.visits && typeof window.api.visits.update === "function") {
          await window.api.visits.update({
            id: editingId,
            propertyId,
            clientId,
            scheduledAt,
            reminderLeadMinutes,
            status,
            notes,
          });
        } else {
          throw new Error("Função de atualização não encontrada na API de visitas.");
        }
        setFeedback({ type: "success", message: "Visita atualizada com sucesso!" });
      } else {
        if (window.api && window.api.visits && typeof window.api.visits.create === "function") {
          await window.api.visits.create({
            propertyId,
            clientId,
            scheduledAt,
            reminderLeadMinutes,
            status,
            notes,
          });
        } else {
          throw new Error("API de visitas não encontrada no preload.");
        }
        setFeedback({ type: "success", message: "Visita agendada com sucesso!" });
      }
      
      handleFecharModal();
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao salvar visita:", error);
      setModalFeedback({
        type: "error",
        message: error?.message || "Erro ao salvar visita. Verifique os dados selecionados.",
      });
    }
  };

  const handleEditarVisita = (visita) => {
    setEditingId(visita.id);
    setPropertyId(visita.propertyId || "");
    setClientId(visita.clientId || "");
    setReminderLeadMinutes(visita.reminderLeadMinutes ?? 30);
    setStatus(visita.status || "AGENDADA");
    setNotes(visita.notes || "");

    if (visita.scheduledAt) {
      const dataObj = new Date(Number(visita.scheduledAt));
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
      const dia = String(dataObj.getDate()).padStart(2, "0");
      const hora = String(dataObj.getHours()).padStart(2, "0");
      const minuto = String(dataObj.getMinutes()).padStart(2, "0");

      setScheduledDate(`${ano}-${mes}-${dia}`);
      setScheduledTime(`${hora}:${minuto}`);
    } else {
      setScheduledDate("");
      setScheduledTime("");
    }

    setModalFeedback({ type: "", message: "" });
    setIsModalOpen(true);
  };

  const handleDeletarVisita = async (id) => {
    if (!confirm("Tem certeza que deseja cancelar ou excluir esta visita?")) return;
    try {
      if (window.api && window.api.visits && typeof window.api.visits.delete === "function") {
        await window.api.visits.delete(id);
      }
      setFeedback({ type: "success", message: "Visita excluída com sucesso!" });
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao excluir visita:", error);
      setFeedback({ type: "error", message: "Erro ao excluir visita." });
    }
  };

  const obterNomeImovel = (id) => {
    const imovel = imoveis.find((i) => String(i.id ?? i._id ?? i.code ?? i.uuid) === String(id));
    if (!imovel) return id;
    return imovel.title || imovel.titulo || imovel.nome || imovel.address || id;
  };

  const obterNomeCliente = (id) => {
    const cliente = clientes.find((c) => String(c.id ?? c._id ?? c.code ?? c.uuid) === String(id));
    if (!cliente) return id;
    return cliente.name || cliente.nome || cliente.razaoSocial || id;
  };

  const anoAtual = currentDate.getFullYear();
  const mesAtual = currentDate.getMonth();

  const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1).getDay();
  const ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

  const nomeMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const mudarMes = (direcao) => {
    setCurrentDate(new Date(anoAtual, mesAtual + direcao, 1));
  };

  const obterVisitasDoDia = (dia) => {
    return visitas.filter((v) => {
      const dataVisita = new Date(Number(v.scheduledAt));
      return (
        dataVisita.getDate() === dia &&
        dataVisita.getMonth() === mesAtual &&
        dataVisita.getFullYear() === anoAtual
      );
    });
  };

  const handleAbrirParaData = (dia) => {
    const mesStr = String(mesAtual + 1).padStart(2, "0");
    const diaStr = String(dia).padStart(2, "0");
    handleAbrirNovoAgendamento(`${anoAtual}-${mesStr}-${diaStr}`);
  };

  if (loading) {
    return <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-on-surface)", fontFamily: "var(--font-family-base)" }}>A carregar dados...</div>;
  }

  return (
    <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: "1200px", margin: "0 auto", fontFamily: "var(--font-family-base)", color: "var(--color-on-surface)" }}>
      
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <button 
            type="button"
            onClick={() => navigate("/imoveis")} 
            style={{ background: "none", border: "none", color: "var(--color-on-surface)", cursor: "pointer", fontSize: "var(--font-body-md)", fontWeight: "500", display: "flex", alignItems: "center", gap: "var(--space-1)", padding: 0, marginBottom: "var(--space-2)" }}
          >
            &larr; Voltar para Imóveis
          </button>
          <h1 style={{ fontSize: "var(--font-headline-sm)", fontWeight: "700", color: "var(--color-on-surface)", margin: 0 }}>
            Agendamento de Visitas
          </h1>
          <p style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)", margin: "var(--space-1) 0 0 0" }}>
            Acompanhe o calendário e gerencie as visitas aos imóveis cadastrados.
          </p>
        </div>

        <button
          onClick={() => handleAbrirNovoAgendamento()}
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-body-md)",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            boxShadow: "var(--elevation-1)"
          }}
        >
          <Plus size={18} />
          Registrar Novo Agendamento
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div style={{ 
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "var(--space-4)",
          fontSize: "var(--font-body-md)",
          backgroundColor: feedback.type === "error" ? "var(--color-error-container)" : "var(--color-success-container)",
          color: feedback.type === "error" ? "var(--color-error)" : "var(--color-success)",
          border: `1px solid ${feedback.type === "error" ? "var(--color-error-container)" : "var(--color-success-container)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback({ type: "", message: "" })}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "700", padding: "0 var(--space-1)" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* CALENDÁRIO VISUAL E TABELA */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        
        {/* Bloco do Calendario */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-md)", padding: "var(--space-5)", boxShadow: "var(--elevation-1)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <h2 style={{ fontSize: "var(--font-title-lg)", fontWeight: "700", color: "var(--color-on-surface)", margin: 0 }}>
              {nomeMeses[mesAtual]} de {anoAtual}
            </h2>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                onClick={() => mudarMes(-1)}
                style={{ background: "var(--color-primary-container)", border: "1px solid var(--color-outline-variant)", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-xs)", cursor: "pointer", fontWeight: "600", color: "var(--color-on-surface)" }}
              >
                &larr; Mês Anterior
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{ background: "var(--color-primary-container)", border: "1px solid var(--color-outline-variant)", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-xs)", cursor: "pointer", fontWeight: "600", color: "var(--color-on-surface)" }}
              >
                Hoje
              </button>
              <button
                onClick={() => mudarMes(1)}
                style={{ background: "var(--color-primary-container)", border: "1px solid var(--color-outline-variant)", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-xs)", cursor: "pointer", fontWeight: "600", color: "var(--color-on-surface)" }}
              >
                Próximo Mês &rarr;
              </button>
            </div>
          </div>

          {/* Legenda de Cores */}
          <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-4)", fontSize: "var(--font-body-sm)", fontWeight: "500", color: "var(--color-on-surface)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={{ width: "12px", height: "12px", background: "var(--color-primary-container)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-xs)" }}></span>
              Agendada
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={{ width: "12px", height: "12px", background: "var(--color-success-container)", border: "1px solid var(--color-success)", borderRadius: "var(--radius-xs)" }}></span>
              Realizada
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={{ width: "12px", height: "12px", background: "var(--color-error-container)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-xs)" }}></span>
              Cancelada
            </div>
          </div>

          {/* Dias da Semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-2)", textAlign: "center", fontWeight: "600", color: "var(--color-on-surface)", fontSize: "var(--font-body-md)", marginBottom: "var(--space-2)" }}>
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
          </div>

          {/* Grelha do Calendario */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-2)" }}>
            {Array.from({ length: primeiroDiaDoMes }).map((_, index) => (
              <div key={`empty-${index}`} style={{ minHeight: "110px", background: "var(--color-primary-container)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-outline-variant)" }} />
            ))}

            {Array.from({ length: ultimoDiaDoMes }).map((_, index) => {
              const dia = index + 1;
              const visitasDoDia = obterVisitasDoDia(dia);
              const ehHoje = 
                dia === new Date().getDate() && 
                mesAtual === new Date().getMonth() && 
                anoAtual === new Date().getFullYear();

              return (
                <div
                  key={`day-${dia}`}
                  style={{
                    minHeight: "110px",
                    background: ehHoje ? "var(--color-primary-container)" : "var(--color-surface)",
                    border: ehHoje ? "2px solid var(--color-primary)" : "1px solid var(--color-outline-variant)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-1)",
                    boxSizing: "border-box",
                    overflowY: "auto",
                    maxHeight: "150px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-1)" }}>
                    <span style={{ fontSize: "var(--font-body-sm)", fontWeight: "700", color: ehHoje ? "var(--color-primary)" : "var(--color-on-surface)" }}>
                      {dia}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAbrirParaData(dia)}
                      title={`Agendar visita para ${dia}/${mesAtual + 1}/${anoAtual}`}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-on-surface)",
                        padding: "var(--space-1)",
                        borderRadius: "var(--radius-xs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {visitasDoDia.map((v) => {
                    const horaFormatada = new Date(Number(v.scheduledAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const statusVisita = v.status || "AGENDADA";
                    const nomeCliente = obterNomeCliente(v.clientId);
                    
                    let bgCard = "var(--color-primary-container)";
                    let colorCard = "var(--color-on-surface)";
                    if (statusVisita === "REALIZADA") {
                      bgCard = "var(--color-success-container)";
                      colorCard = "var(--color-success)";
                    } else if (statusVisita === "CANCELADA") {
                      bgCard = "var(--color-error-container)";
                      colorCard = "var(--color-error)";
                    }

                    return (
                      <div
                        key={v.id}
                        data-visit-id={v.id}
                        onClick={() => handleEditarVisita(v)}
                        title={`Status: ${statusVisita}\nCliente: ${nomeCliente}\nImóvel: ${obterNomeImovel(v.propertyId)}`}
                        style={{
                          background: bgCard,
                          color: colorCard,
                          fontSize: "var(--font-body-sm)",
                          padding: "var(--space-1) var(--space-1)",
                          borderRadius: "var(--radius-xs)",
                          marginBottom: "var(--space-1)",
                          cursor: "pointer",
                          wordBreak: "break-word",
                          lineHeight: "1.3",
                          fontWeight: "500",
                          outline: String(v.id) === requestedVisitId ? "2px solid var(--color-primary)" : undefined,
                        }}
                      >
                        <strong>{horaFormatada}</strong> - {nomeCliente}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bloco da Tabela logo abaixo do Calendario */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-md)", padding: "var(--space-5)", boxShadow: "var(--elevation-1)" }}>
          <h2 style={{ fontSize: "var(--font-title-lg)", fontWeight: "700", marginBottom: "var(--space-4)", color: "var(--color-on-surface)" }}>Lista Geral de Visitas</h2>

          {visitas.length === 0 ? (
            <p style={{ color: "var(--color-on-surface)", fontSize: "var(--font-body-md)", textAlign: "center", padding: "var(--space-6) 0" }}>Nenhuma visita registrada até ao momento.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--font-body-md)" }}>
                <thead>
                  <tr style={{ background: "var(--color-primary-container)", color: "var(--color-on-surface)", borderBottom: "2px solid var(--color-outline-variant)" }}>
                    <th style={{ padding: "var(--space-3)" }}>Data / Hora</th>
                    <th style={{ padding: "var(--space-3)" }}>Imóvel</th>
                    <th style={{ padding: "var(--space-3)" }}>Cliente</th>
                    <th style={{ padding: "var(--space-3)" }}>Status</th>
                    <th style={{ padding: "var(--space-3)" }}>Notas</th>
                    <th style={{ padding: "var(--space-3)" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((v) => (
                    <tr
                      key={v.id}
                      data-visit-id={v.id}
                      style={{
                        borderBottom: "1px solid var(--color-outline-variant)",
                        background: String(v.id) === requestedVisitId ? "var(--color-primary-container)" : undefined,
                      }}
                    >
                      <td style={{ padding: "var(--space-3)", fontWeight: "500" }}>{new Date(Number(v.scheduledAt)).toLocaleString()}</td>
                      <td style={{ padding: "var(--space-3)" }}>{obterNomeImovel(v.propertyId)}</td>
                      <td style={{ padding: "var(--space-3)" }}>{obterNomeCliente(v.clientId)}</td>
                      <td style={{ padding: "var(--space-3)" }}>
                        <span style={{ 
                          padding: "var(--space-1) var(--space-2)",
                          borderRadius: "var(--radius-xs)",
                          fontSize: "var(--font-body-sm)",
                          fontWeight: "600",
                          background: v.status === "REALIZADA" ? "var(--color-success-container)" : v.status === "CANCELADA" ? "var(--color-error-container)" : "var(--color-primary-container)",
                          color: v.status === "REALIZADA" ? "var(--color-success)" : v.status === "CANCELADA" ? "var(--color-error)" : "var(--color-on-surface-variant)"
                        }}>
                          {v.status || "AGENDADA"}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-3)", color: "var(--color-on-surface)" }}>{v.notes || "-"}</td>
                      <td style={{ padding: "var(--space-3)", display: "flex", gap: "var(--space-2)" }}>
                        <button
                          onClick={() => handleEditarVisita(v)}
                          style={{ background: "var(--color-primary-container)", color: "var(--color-on-surface)", border: "none", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-xs)", fontSize: "var(--font-body-sm)", fontWeight: "600", cursor: "pointer" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletarVisita(v.id)}
                          style={{ background: "var(--color-error-container)", color: "var(--color-error)", border: "none", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-xs)", fontSize: "var(--font-body-sm)", fontWeight: "600", cursor: "pointer" }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE REGISTRAR / EDITAR AGENDAMENTO */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "var(--color-scrim)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleFecharModal();
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md)",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "var(--elevation-5)",
              padding: "var(--space-5)",
              position: "relative"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
              <div>
                <h2 style={{ fontSize: "var(--font-title-lg)", fontWeight: "700", color: "var(--color-on-surface)", margin: 0 }}>
                  {editingId ? "Editar Agendamento de Visita" : "Registrar Novo Agendamento"}
                </h2>
                <p style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)", margin: "var(--space-1) 0 0 0" }}>
                  {editingId ? "Atualize as informações da visita selecionada." : "Preencha os dados abaixo para agendar uma nova visita."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFecharModal}
                aria-label="Fechar"
                style={{
                  background: "var(--color-primary-container)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-on-surface)",
                  padding: "var(--space-1)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Feedback Alert */}
            {modalFeedback.message && (
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "var(--space-4)",
                  fontSize: "var(--font-body-md)",
                  backgroundColor: modalFeedback.type === "error" ? "var(--color-error-container)" : "var(--color-success-container)",
                  color: modalFeedback.type === "error" ? "var(--color-error)" : "var(--color-success)",
                  border: `1px solid ${modalFeedback.type === "error" ? "var(--color-error-container)" : "var(--color-success-container)"}`
                }}
              >
                {modalFeedback.message}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSalvarVisita}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                    Imóvel *
                  </label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    required
                    style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", background: "var(--color-surface)", boxSizing: "border-box" }}
                  >
                    <option value="">Selecione um imóvel...</option>
                    {imoveis.length > 0 ? (
                      imoveis.map((imovel) => {
                        const idReal = imovel.id ?? imovel._id ?? imovel.code ?? imovel.uuid;
                        const nomeExibicao = imovel.title || imovel.titulo || imovel.nome || imovel.address || idReal;
                        return (
                          <option key={idReal} value={idReal}>
                            {nomeExibicao}
                          </option>
                        );
                      })
                    ) : (
                      <option value="exemplo-imovel-id">Nenhum imóvel carregado (Modo Teste)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                    Cliente Interessado *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", background: "var(--color-surface)", boxSizing: "border-box" }}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.length > 0 ? (
                      clientes.map((cliente) => {
                        const idReal = cliente.id ?? cliente._id ?? cliente.code ?? cliente.uuid;
                        const nomeExibicao = cliente.name || cliente.nome || cliente.razaoSocial || idReal;
                        return (
                          <option key={idReal} value={idReal}>
                            {nomeExibicao}
                          </option>
                        );
                      })
                    ) : (
                      <option value="exemplo-cliente-id">Nenhum cliente carregado (Modo Teste)</option>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                    Status da Visita *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", background: "var(--color-surface)", boxSizing: "border-box" }}
                  >
                    <option value="AGENDADA">Agendada</option>
                    <option value="REALIZADA">Realizada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                    Data da Visita *
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                    style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                  Notificar antes da visita
                </label>
                <select
                  value={reminderLeadMinutes === null ? "none" : reminderLeadMinutes}
                  onChange={(e) => setReminderLeadMinutes(e.target.value === "none" ? null : Number(e.target.value))}
                  style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", background: "var(--color-surface)", boxSizing: "border-box" }}
                >
                  <option value={30}>30 minutos antes</option>
                  <option value={1440}>1 dia antes</option>
                  <option value={2880}>2 dias antes</option>
                  <option value={10080}>1 semana antes</option>
                  <option value="none">Sem notificação</option>
                </select>
              </div>

              <div style={{ marginBottom: "var(--space-5)" }}>
                <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", marginBottom: "var(--space-1)", color: "var(--color-on-surface-variant)" }}>
                  Descrição e Observações da Visita
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Insira notas detalhadas sobre a visita..."
                  rows={4}
                  style={{ width: "100%", padding: "var(--space-3)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
                <button
                  type="button"
                  onClick={handleFecharModal}
                  style={{ background: "var(--color-primary-container)", color: "var(--color-on-surface)", border: "1px solid var(--color-outline-variant)", padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-sm)", fontWeight: "600", fontSize: "var(--font-body-md)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", border: "none", padding: "var(--space-2) var(--space-5)", borderRadius: "var(--radius-sm)", fontWeight: "600", fontSize: "var(--font-body-md)", cursor: "pointer" }}
                >
                  {editingId ? "Salvar Alterações" : "Salvar Agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
