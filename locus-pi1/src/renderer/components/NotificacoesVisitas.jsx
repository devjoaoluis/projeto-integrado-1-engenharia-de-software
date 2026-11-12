import React, { useState, useEffect } from "react";
import { Bell, Calendar, Clock, AlertCircle } from "lucide-react";

export default function NotificacoesVisitas() {
  const [visitasHoje, setVisitasHoje] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verificarVisitas() {
      try {
        // Busca as visitas cadastradas na API do Electron
        const visitas = window.api && window.api.visits && typeof window.api.visits.list === "function"
          ? await window.api.visits.list()
          : [];

        const hojeStr = new Date().toISOString().split("ot")[0]; // YYYY-MM-DD (ou formato equivalente do seu banco)

        // Filtra visitas cuja data corresponda ao dia de hoje e que estejam ativas/agendadas
        const filtradas = (visitas || []).filter((v) => {
          const dataVisita = v.date ? v.date.split("T")[0] : "";
          const status = (v.status || "").toUpperCase();
          return dataVisita === hojeStr && (status === "AGENDADA" || status === "SCHEDULED" || !status);
        });

        setVisitasHoje(filtradas);
      } catch (err) {
        console.error("Erro ao carregar lembretes de visitas:", err);
      } finally {
        setLoading(false);
      }
    }

    verificarVisitas();
    // Opcional: atualizar a cada 5 minutos
    const intervalo = setInterval(verificarVisitas, 300000);
    return () => clearInterval(intervalo);
  }, []);

  if (loading || visitasHoje.length === 0) {
    return null; // Não exibe nada se não houver visitas hoje
  }

  return (
    <div style={{
      backgroundColor: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{ backgroundColor: "#dbeafe", padding: "8px", borderRadius: "50%", color: "#2563eb" }}>
        <Bell size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "600", color: "#1e40af" }}>
          Lembrete: Você tem {visitasHoje.length} visita(s) agendada(s) para hoje!
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
          {visitasHoje.map((v, index) => (
            <div key={v.id || index} style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "13px",
              color: "#334155",
              backgroundColor: "#ffffff",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0"
            }}>
              <span style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={14} color="#2563eb" /> {v.time || v.horario || "Horário não especificado"}
              </span>
              <span>Cliente: <strong>{v.clientName || v.nomeCliente || "Cliente"}</strong></span>
              <span style={{ color: "#64748b" }}>Imóvel: {v.propertyTitle || v.imovel || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}