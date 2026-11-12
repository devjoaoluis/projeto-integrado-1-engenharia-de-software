import React, { useState, useEffect } from 'react';
import { User, Bell, Clock } from 'lucide-react';

export function Header() {
  const [visitasHoje, setVisitasHoje] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  useEffect(() => {
    async function verificarVisitas() {
      try {
        const visitas = window.api && window.api.visits && typeof window.api.visits.list === "function"
          ? await window.api.visits.list()
          : [];

        const hojeStr = new Date().toISOString().split("T")[0];

        const filtradas = (visitas || []).filter((v) => {
          const dataVisita = v.date ? v.date.split("T")[0] : "";
          const status = (v.status || "").toUpperCase();
          return dataVisita === hojeStr && (status === "AGENDADA" || status === "SCHEDULED" || !status);
        });

        setVisitasHoje(filtradas);
      } catch (err) {
        console.error("Erro ao carregar lembretes de visitas:", err);
      }
    }

    verificarVisitas();
  }, []);

  return (
    <header style={{
      backgroundColor: '#1877f2',
      color: '#ffffff',
      height: '60px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'relative',
      zIndex: 100,
      fontFamily: 'Inter, sans-serif'
    }}>
      <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Home</h1>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', zIndex: 101 }}>
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#ffffff', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            padding: '8px' 
          }}
          aria-label="Perfil"
        >
          <User size={22} />
        </button><button 
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    alert("O sino foi clicado com sucesso!");
    setMostrarDropdown(!mostrarDropdown);
  }}
  style={{ 
    background: '#ff0000', // Vermelho temporário para garantir que vemos o botão
    border: '2px solid #ffffff', 
    color: '#ffffff', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center',
    padding: '8px',
    position: 'relative',
    zIndex: 999999
  }}
>
  <Bell size={22} />
</button>

        <div style={{ position: 'relative' }}>
          <button 
            type="button"
            onClick={() => {
              console.log("Clicou no sino!");
              setMostrarDropdown(!mostrarDropdown);
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#ffffff', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              padding: '8px',
              position: 'relative'
            }}
            aria-label="Notificações"
          >
            <Bell size={22} />
            {visitasHoje.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #1877f2',
                pointerEvents: 'none'
              }}>
                {visitasHoje.length}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {mostrarDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '45px',
              width: '320px',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              zIndex: 99999,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Lembretes de Visitas (Hoje)</span>
                <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                  {visitasHoje.length}
                </span>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {visitasHoje.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Nenhuma visita agendada para hoje.
                  </div>
                ) : (
                  visitasHoje.map((v, index) => (
                    <div key={v.id || index} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
                        <Clock size={13} /> {v.time || v.horario || "Horário não informado"}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                        Cliente: {v.clientName || v.nomeCliente || "Cliente"}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Imóvel: {v.propertyTitle || v.imovel || "—"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}