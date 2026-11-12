import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

export const AgendamentoVisitas = () => {
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
  const [status, setStatus] = useState("AGENDADA");
  const [notes, setNotes] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

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

      if (editingId) {
        if (window.api && window.api.visits && typeof window.api.visits.update === "function") {
          await window.api.visits.update({
            id: editingId,
            propertyId,
            clientId,
            scheduledAt,
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
      setModalFeedback({ type: "error", message: "Erro ao salvar visita. Verifique os dados selecionados." });
    }
  };

  const handleEditarVisita = (visita) => {
    setEditingId(visita.id);
    setPropertyId(visita.propertyId || "");
    setClientId(visita.clientId || "");
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
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontFamily: "Inter, sans-serif" }}>A carregar dados...</div>;
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif", color: "#1e293b" }}>
      
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <button 
            onClick={() => window.history.back()} 
            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px", padding: 0, marginBottom: "8px" }}
          >
            &larr; Voltar para Imóveis
          </button>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
            Agendamento de Visitas
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
            Acompanhe o calendário e gerencie as visitas aos imóveis cadastrados.
          </p>
        </div>

        <button
          onClick={() => handleAbrirNovoAgendamento()}
          style={{
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 1px 3px rgba(37,99,235,0.2)"
          }}
        >
          <Plus size={18} />
          Registrar Novo Agendamento
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div style={{ 
          padding: "12px 16px", 
          borderRadius: "6px", 
          marginBottom: "20px", 
          fontSize: "14px",
          backgroundColor: feedback.type === "error" ? "#fee2e2" : "#dcfce7",
          color: feedback.type === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${feedback.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback({ type: "", message: "" })}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "700", padding: "0 4px" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* CALENDÁRIO VISUAL E TABELA */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Bloco do Calendario */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              {nomeMeses[mesAtual]} de {anoAtual}
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => mudarMes(-1)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600", color: "#334155" }}
              >
                &larr; Mês Anterior
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600", color: "#334155" }}
              >
                Hoje
              </button>
              <button
                onClick={() => mudarMes(1)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600", color: "#334155" }}
              >
                Próximo Mês &rarr;
              </button>
            </div>
          </div>

          {/* Legenda de Cores */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "12px", fontWeight: "500", color: "#475569", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "3px" }}></span>
              Agendada
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "3px" }}></span>
              Realizada
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "3px" }}></span>
              Cancelada
            </div>
          </div>

          {/* Dias da Semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center", fontWeight: "600", color: "#64748b", fontSize: "13px", marginBottom: "8px" }}>
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
          </div>

          {/* Grelha do Calendario */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {Array.from({ length: primeiroDiaDoMes }).map((_, index) => (
              <div key={`empty-${index}`} style={{ minHeight: "110px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }} />
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
                    background: ehHoje ? "#eff6ff" : "#ffffff",
                    border: ehHoje ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "6px",
                    boxSizing: "border-box",
                    overflowY: "auto",
                    maxHeight: "150px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: ehHoje ? "#2563eb" : "#334155" }}>
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
                        color: "#94a3b8",
                        padding: "2px",
                        borderRadius: "4px",
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
                    
                    let bgCard = "#dbeafe";
                    let colorCard = "#1e40af";
                    if (statusVisita === "REALIZADA") {
                      bgCard = "#dcfce7";
                      colorCard = "#166534";
                    } else if (statusVisita === "CANCELADA") {
                      bgCard = "#fee2e2";
                      colorCard = "#991b1b";
                    }

                    return (
                      <div
                        key={v.id}
                        onClick={() => handleEditarVisita(v)}
                        title={`Status: ${statusVisita}\nCliente: ${nomeCliente}\nImóvel: ${obterNomeImovel(v.propertyId)}`}
                        style={{
                          background: bgCard,
                          color: colorCard,
                          fontSize: "11px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          marginBottom: "4px",
                          cursor: "pointer",
                          wordBreak: "break-word",
                          lineHeight: "1.3",
                          fontWeight: "500"
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
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px", color: "#0f172a" }}>Lista Geral de Visitas</h2>

          {visitas.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "14px", textAlign: "center", padding: "30px 0" }}>Nenhuma visita registrada até ao momento.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px" }}>Data / Hora</th>
                    <th style={{ padding: "12px" }}>Imóvel</th>
                    <th style={{ padding: "12px" }}>Cliente</th>
                    <th style={{ padding: "12px" }}>Status</th>
                    <th style={{ padding: "12px" }}>Notas</th>
                    <th style={{ padding: "12px" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((v) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px", fontWeight: "500" }}>{new Date(Number(v.scheduledAt)).toLocaleString()}</td>
                      <td style={{ padding: "12px" }}>{obterNomeImovel(v.propertyId)}</td>
                      <td style={{ padding: "12px" }}>{obterNomeCliente(v.clientId)}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ 
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          fontSize: "11px", 
                          fontWeight: "600",
                          background: v.status === "REALIZADA" ? "#dcfce7" : v.status === "CANCELADA" ? "#fee2e2" : "#dbeafe",
                          color: v.status === "REALIZADA" ? "#166534" : v.status === "CANCELADA" ? "#991b1b" : "#1e40af"
                        }}>
                          {v.status || "AGENDADA"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "#64748b" }}>{v.notes || "-"}</td>
                      <td style={{ padding: "12px", display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEditarVisita(v)}
                          style={{ background: "#e0f2fe", color: "#0369a1", border: "none", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletarVisita(v.id)}
                          style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
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
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleFecharModal();
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              padding: "28px",
              position: "relative"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  {editingId ? "Editar Agendamento de Visita" : "Registrar Novo Agendamento"}
                </h2>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                  {editingId ? "Atualize as informações da visita selecionada." : "Preencha os dados abaixo para agendar uma nova visita."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFecharModal}
                aria-label="Fechar"
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "6px",
                  borderRadius: "6px",
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
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  backgroundColor: modalFeedback.type === "error" ? "#fee2e2" : "#dcfce7",
                  color: modalFeedback.type === "error" ? "#991b1b" : "#166534",
                  border: `1px solid ${modalFeedback.type === "error" ? "#fecaca" : "#bbf7d0"}`
                }}
              >
                {modalFeedback.message}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSalvarVisita}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                    Imóvel *
                  </label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", background: "#fff", boxSizing: "border-box" }}
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
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                    Cliente Interessado *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", background: "#fff", boxSizing: "border-box" }}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                    Status da Visita *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", background: "#fff", boxSizing: "border-box" }}
                  >
                    <option value="AGENDADA">Agendada</option>
                    <option value="REALIZADA">Realizada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                    Data da Visita *
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                  Descrição e Observações da Visita
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Insira notas detalhadas sobre a visita..."
                  rows={4}
                  style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleFecharModal}
                  style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "10px 18px", borderRadius: "6px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "6px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
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
