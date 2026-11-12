import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { User, Bell, Clock } from "lucide-react";
import { Sidebar } from "../components/Sidebar";

const titulos = {
    "/home": "Home",
    "/imoveis": "Imóveis",
    "/contatos": "Contatos",
    "/imoveis/cadastrar": "Cadastrar Imóvel",
    "/contratos": "Contratos",
    "/pagamentos": "Pagamentos",
    "/visitas": "Visitas",
    "/vistorias": "Vistorias",
    "/locatarios": "Locatários",
};

function AppLayout() {
    const { pathname } = useLocation();
    const titulo = titulos[pathname] ?? (
        pathname === "/imoveis/cadastrar" ? "Cadastrar imóvel" :
        pathname.startsWith("/imoveis/") ? "Visão geral do imóvel" :
        pathname.startsWith("/locatarios/") ? "Visão geral do locatário" :
        "Locus"
    );

    const [visitasHoje, setVisitasHoje] = useState([]);
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const dropdownRef = useRef(null);

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
        const intervalo = setInterval(verificarVisitas, 300000);
        return () => clearInterval(intervalo);
    }, []);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setMostrarDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <style>
                {`
                    .layout {
                        display: flex;
                        min-height: 100vh;
                    }

                    .principal {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }

                    .topo {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background-color: #1877f2;
                        color: white;
                        padding: 16px 24px;
                        position: relative;
                        z-index: 100;
                    }

                    .topo h1 {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 0;
                    }

                    .topo-identidade {
                        display: flex;
                        align-items: baseline;
                        gap: 16px;
                    }

                    .topo-marca {
                        font-size: 22px;
                        font-weight: 700;
                    }

                    .topo-icones {
                        display: flex;
                        gap: 16px;
                        align-items: center;
                    }

                    .conteudo {
                        flex: 1;
                        background-color: #ffffff;
                        padding: 24px;
                    }

                    .botao-voltar-padrao {
                        align-self: flex-start;
                        margin-bottom: 16px;
                        padding: 8px 0;
                        border: none;
                        background: transparent;
                        color: #1976d2;
                        font-weight: 700;
                        cursor: pointer;
                    }

                    .botao-voltar-padrao:hover {
                        text-decoration: underline;
                    }
                `}
            </style>

            <div className="layout">
                <Sidebar />

                <div className="principal">
                    <header className="topo">
                        <div className="topo-identidade">
                            <span className="topo-marca">Locus</span>
                            <h1>{titulo}</h1>
                        </div>
                        <div className="topo-icones">
                            <button 
                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                aria-label="Perfil"
                            >
                                <User size={20} />
                            </button>

                            <div style={{ position: 'relative' }} ref={dropdownRef}>
                                <button 
                                    onClick={() => setMostrarDropdown(!mostrarDropdown)}
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: '#fff', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        padding: '4px',
                                        position: 'relative'
                                    }}
                                    aria-label="Notificações"
                                >
                                    <Bell size={20} />
                                    {visitasHoje.length > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-3px',
                                            right: '-3px',
                                            backgroundColor: '#ef4444',
                                            color: '#fff',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            borderRadius: '50%',
                                            width: '16px',
                                            height: '16px',
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

                                {/* Dropdown de Notificações */}
                                {mostrarDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '40px',
                                        width: '300px',
                                        backgroundColor: '#ffffff',
                                        color: '#1e293b',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                        border: '1px solid #e2e8f0',
                                        zIndex: 99999,
                                        overflow: 'hidden',
                                        textAlign: 'left'
                                    }}>
                                        <div style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #e2e8f0',
                                            backgroundColor: '#f8fafc',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>Notificações</span>
                                            <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                                {visitasHoje.length}
                                            </span>
                                        </div>

                                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                            {visitasHoje.length === 0 ? (
                                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                                    Nenhuma notificação no momento.
                                                </div>
                                            ) : (
                                                visitasHoje.map((v, index) => (
                                                    <div key={v.id || index} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                                                            <Clock size={12} /> {v.time || v.horario || "Horário não informado"}
                                                        </div>
                                                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>
                                                            Cliente: {v.clientName || v.nomeCliente || "Cliente"}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
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

                    <main className="conteudo">
                        <Outlet />
                    </main>
                </div>
            </div>
        </>
    );
}

export default AppLayout;