import React, { useState, useEffect } from "react";

export const AgendamentoVisitas = () => {
  const [visitas, setVisitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("registrar");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

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

  const handleSalvarVisita = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    if (!propertyId || !clientId || !scheduledDate || !scheduledTime) {
      setFeedback({ type: "error", message: "Por favor, preencha todos os campos obrigatorios." });
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
          throw new Error("Funcao de atualizacao nao encontrada na API de visitas.");
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
          throw new Error("API de visitas nao encontrada no preload.");
        }
        setFeedback({ type: "success", message: "Visita agendada com sucesso!" });
      }
      
      limparFormulario();
      setActiveTab("calendario");
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao salvar visita:", error);
      setFeedback({ type: "error", message: "Erro ao salvar visita. Verifique os dados selecionados." });
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
    }

    setActiveTab("registrar");
  };

  const limparFormulario = () => {
    setEditingId(null);
    setPropertyId("");
    setClientId("");
    setScheduledDate("");
    setScheduledTime("");
    setStatus("AGENDADA");
    setNotes("");
  };

  const handleDeletarVisita = async (id) => {
    if (!confirm("Tem certeza que deseja cancelar ou excluir esta visita?")) return;
    try {
      if (window.api && window.api.visits && typeof window.api.visits.delete === "function") {
        await window.api.visits.delete(id);
      }
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao excluir visita:", error);
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
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
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

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontFamily: "Inter, sans-serif" }}>A carregar dados...</div>;
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif", color: "#1e293b" }}>
      
      <div style={{ marginBottom: "20px" }}>
        <button 
          onClick={() => window.history.back()} 
          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
        >
          &larr; Voltar para Imoveis
        </button>
      </div>

      {feedback.message && (
        <div style={{ 
          padding: "12px 16px", 
          borderRadius: "6px", 
          marginBottom: "20px", 
          fontSize: "14px",
          backgroundColor: feedback.type === "error" ? "#fee2e2" : "#dcfce7",
          color: feedback.type === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${feedback.type === "error" ? "#fecaca" : "#bbf7d0"}`
        }}>
          {feedback.message}
        </div>
      )}

      {/* Abas de Navegacao */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "24px", gap: "32px", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "32px" }}>
          <button
            onClick={() => {
              if (activeTab !== "registrar") limparFormulario();
              setActiveTab("registrar");
            }}
            style={{
              background: "none",
              border: "none",
              padding: "12px 0",
              fontSize: "15px",
              fontWeight: "600",
              color: activeTab === "registrar" ? "#2563eb" : "#64748b",
              borderBottom: activeTab === "registrar" ? "2px solid #2563eb" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: "-1px"
            }}
          >
            {editingId ? "Editar Visita" : "Registrar Nova Visita"}
          </button>
          <button
            onClick={() => setActiveTab("calendario")}
            style={{
              background: "none",
              border: "none",
              padding: "12px 0",
              fontSize: "15px",
              fontWeight: "600",
              color: activeTab === "calendario" ? "#2563eb" : "#64748b",
              borderBottom: activeTab === "calendario" ? "2px solid #2563eb" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: "-1px"
            }}
          >
            Calendario de Visitas
          </button>
        </div>

        {editingId && activeTab === "registrar" && (
          <button
            onClick={limparFormulario}
            style={{ background: "#e2e8f0", color: "#334155", border: "none", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Cancelar Edicao
          </button>
        )}
      </div>

      {/* ABA: REGISTRAR / EDITAR */}
      {activeTab === "registrar" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px", color: "#0f172a" }}>
            {editingId ? "Editar Dados da Visita" : "Dados da Visita"}
          </h2>

          <form onSubmit={handleSalvarVisita}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                  Imovel *
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", background: "#fff", boxSizing: "border-box" }}
                >
                  <option value="">Selecione um imovel...</option>
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
                    <option value="exemplo-imovel-id">Nenhum imovel carregado (Modo Teste)</option>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
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
                  Horario *
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
                Descricao e Observacoes da Visita *
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
              {editingId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  style={{ background: "#e2e8f0", color: "#334155", border: "none", padding: "12px 20px", borderRadius: "6px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                style={{ background: "#2563eb", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "6px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
              >
                {editingId ? "Salvar Alteracoes" : "Salvar Agendamento"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA: CALENDARIO VISUAL COM TABELA EMBAIXO */}
      {activeTab === "calendario" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Bloco do Calendario */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                {nomeMeses[mesAtual]} de {anoAtual}
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => mudarMes(-1)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  &larr; Mes Anterior
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  Hoje
                </button>
                <button
                  onClick={() => mudarMes(1)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  Proximo Mes &rarr;
                </button>
              </div>
            </div>

            {/* Legenda de Cores */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "12px", fontWeight: "500", color: "#475569" }}>
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
              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sab</div>
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
                    <div style={{ fontSize: "12px", fontWeight: "700", color: ehHoje ? "#2563eb" : "#334155", marginBottom: "4px" }}>
                      {dia}
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
                          title={`Status: ${statusVisita}\nCliente: ${nomeCliente} \nImovel: ${obterNomeImovel(v.propertyId)}`}
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
              <p style={{ color: "#64748b", fontSize: "14px", textAlign: "center", padding: "30px 0" }}>Nenhuma visita registrada ate ao momento.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px" }}>Data / Hora</th>
                    <th style={{ padding: "12px" }}>Imovel</th>
                    <th style={{ padding: "12px" }}>Cliente</th>
                    <th style={{ padding: "12px" }}>Status</th>
                    <th style={{ padding: "12px" }}>Notas</th>
                    <th style={{ padding: "12px" }}>Acoes</th>
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
            )}
          </div>

        </div>
      )}

    </div>
  );
};