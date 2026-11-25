import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { User, Bell, Clock, AlertTriangle, X } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { notificarSistema } from "../components/Header";

const JANELA_ANTECEDENCIA_MIN = 30;
const CHAVE_ATRASO_MANUAL = "locus_atrasos_manuais";

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

function lerMapaAtrasoManual() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_ATRASO_MANUAL) || "{}");
    } catch {
        return {};
    }
}

function formatarDataLocal(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatarHoraLocal(data) {
    const hh = String(data.getHours()).padStart(2, "0");
    const mm = String(data.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function obterDataObjeto(visita) {
    const bruto = visita.scheduledAt ?? visita.date ?? visita.visitDate;
    if (!bruto) return null;
    if (typeof bruto === "number") {
        const d = new Date(bruto);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const str = String(bruto).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [ano, mes, dia] = str.split("-").map(Number);
        return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    }
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
}

function obterHoraVisita(visita, dataObj) {
    const rawHora = visita.time || visita.horario || visita.hour;
    if (typeof rawHora === "string" && rawHora.trim()) {
        return rawHora.trim().slice(0, 5);
    }
    if (!dataObj) return "";
    const bruto = visita.scheduledAt ?? visita.date ?? visita.visitDate;
    if (typeof bruto === "string" && /^\d{4}-\d{2}-\d{2}$/.test(bruto.trim())) {
        return "";
    }
    return formatarHoraLocal(dataObj);
}

function calcularMinutosAteVisita(dataObj, horaStr, agora = new Date()) {
    if (!dataObj || !horaStr) return null;
    const match = horaStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const horas = Number(match[1]);
    const minutos = Number(match[2]);
    if (horas > 23 || minutos > 59) return null;

    const alvo = new Date(
        dataObj.getFullYear(),
        dataObj.getMonth(),
        dataObj.getDate(),
        horas,
        minutos,
        0,
        0
    );
    return Math.round((alvo.getTime() - agora.getTime()) / 60000);
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

function AppLayout() {
    const { pathname } = useLocation();
    const titulo = titulos[pathname] ?? (
        pathname === "/imoveis/cadastrar" ? "Cadastrar imóvel" :
        pathname.startsWith("/imoveis/") ? "Visão geral do imóvel" :
        pathname.startsWith("/locatarios/") ? "Visão geral do locatário" :
        "Locus"
    );

    const [visitasHoje, setVisitasHoje] = useState([]);
    const [alertasAtraso, setAlertasAtraso] = useState([]);
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const [bannerAberto, setBannerAberto] = useState(false);
    const [mensagemBanner, setMensagemBanner] = useState("");
    const [bannerCritico, setBannerCritico] = useState(false);
    const dropdownRef = useRef(null);
    const alertasEnviadosRef = useRef(new Set());

    useEffect(() => {
        let ativo = true;

        async function verificarNotificacoes() {
            try {
                const [visitas, clientes, alugueis, imoveis, pagamentos] = await Promise.all([
                    window.api && window.api.visits && typeof window.api.visits.list === "function"
                        ? window.api.visits.list().catch(() => [])
                        : [],
                    window.api && window.api.clients && typeof window.api.clients.list === "function"
                        ? window.api.clients.list().catch(() => [])
                        : [],
                    window.api && window.api.rentals && typeof window.api.rentals.list === "function"
                        ? window.api.rentals.list().catch(() => [])
                        : [],
                    window.api && window.api.properties && typeof window.api.properties.list === "function"
                        ? window.api.properties.list().catch(() => [])
                        : [],
                    window.api && window.api.payments && typeof window.api.payments.list === "function"
                        ? window.api.payments.list().catch(() => [])
                        : [],
                ]);

                if (!ativo) return;

                const agora = new Date();
                const hojeStr = formatarDataLocal(agora);

                const filtradasVisitas = (visitas || [])
                    .map((v, index) => {
                        const dataObj = obterDataObjeto(v);
                        const dataISO = dataObj ? formatarDataLocal(dataObj) : "";
                        const horaFormatada = obterHoraVisita(v, dataObj);
                        const minutosAte =
                            dataISO === hojeStr ? calcularMinutosAteVisita(dataObj, horaFormatada, agora) : null;
                        const iminente = minutosAte !== null && minutosAte <= JANELA_ANTECEDENCIA_MIN;
                        const chaveBase = String(v.id ?? `${dataISO}-${horaFormatada}-${index}`);

                        return {
                            ...v,
                            _dataISO: dataISO,
                            _chaveBase: chaveBase,
                            _horaFormatada: horaFormatada || "Horário não informado",
                            _minutosAte: minutosAte,
                            _iminente: iminente,
                        };
                    })
                    .filter((v) => {
                        const status = (v.status || "").toUpperCase();
                        const ativa = !["CANCELADA", "CANCELLED", "CONCLUIDA", "COMPLETED", "REALIZADA"].includes(status);
                        return v._dataISO === hojeStr && ativa;
                    });

                setVisitasHoje(filtradasVisitas);

                const imovelPorId = {};
                (imoveis || []).forEach((im) => {
                    imovelPorId[im.id] = im.title || im.address || `Imóvel #${String(im.id).slice(0, 5)}`;
                });

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

                const inadimplentes = (clientes || [])
                    .filter((c) => {
                        const isTenant = !c.type || String(c.type).toUpperCase() === "TENANT";
                        const atrasadoStatus = ["atrasado", "overdue"].includes(
                            String(c.status || "").trim().toLowerCase()
                        );
                        const temPgtoAtrasado = (atrasosPorCliente[String(c.id)] || 0) > 0;
                        const temLocacaoAtrasada = Boolean(atrasoPorLocacaoCliente[String(c.id)]);
                        const temAtrasoManual = Boolean(mapaManual[String(c.id)]);
                        return isTenant && (atrasadoStatus || temPgtoAtrasado || temLocacaoAtrasada || temAtrasoManual);
                    })
                    .map((c, idx) => ({
                        id: String(c.id ?? idx),
                        nome: c.name || c.nome || "Locatário",
                        imovel: imovelPorCliente[String(c.id)] || c.imovel || c.property || "—",
                        qtdPagamentosAtrasados: atrasosPorCliente[String(c.id)] || 0,
                    }));

                setAlertasAtraso(inadimplentes);

                // Limpa chaves de locatários que não estão mais atrasados
                const idsAtrasadosAtuais = new Set(inadimplentes.map((l) => `atraso-${l.id}`));
                Array.from(alertasEnviadosRef.current).forEach((chave) => {
                    if (chave.startsWith("atraso-") && !idsAtrasadosAtuais.has(chave)) {
                        alertasEnviadosRef.current.delete(chave);
                    }
                });

                const visitasIminentesNovas = filtradasVisitas.filter((v) => {
                    if (!v._iminente) return false;
                    const chave = `visita-iminente-${v._chaveBase}`;
                    if (alertasEnviadosRef.current.has(chave)) return false;
                    alertasEnviadosRef.current.add(chave);
                    return true;
                });

                const visitasDiaNovas = filtradasVisitas.filter((v) => {
                    const chave = `visita-dia-${v._chaveBase}`;
                    if (alertasEnviadosRef.current.has(chave)) return false;
                    alertasEnviadosRef.current.add(chave);
                    return true;
                });

                const inadimplentesNovos = inadimplentes.filter((l) => {
                    const chave = `atraso-${l.id}`;
                    if (alertasEnviadosRef.current.has(chave)) return false;
                    alertasEnviadosRef.current.add(chave);
                    return true;
                });

                const itensNotificacaoNativa = [];

                if (inadimplentesNovos.length > 0) {
                    inadimplentesNovos.forEach((l) => {
                        itensNotificacaoNativa.push({
                            titulo: `Locatário em atraso (${inadimplentes.length} no total)`,
                            corpo: `${l.nome} — ${l.imovel}`,
                            tag: `atraso-${l.id}-${inadimplentes.length}`,
                        });
                    });
                }

                const alvosVisitas = visitasIminentesNovas.length > 0 ? visitasIminentesNovas : visitasDiaNovas;
                alvosVisitas.forEach((v) => {
                    const cliente = v.clientName || v.nomeCliente || "Cliente";
                    const imovel = v.propertyTitle || v.imovel || "";
                    itensNotificacaoNativa.push({
                        titulo: v._iminente ? `Visita próxima (${v._horaFormatada})` : `Visita hoje (${v._horaFormatada})`,
                        corpo: imovel ? `${cliente} — ${imovel}` : cliente,
                        tag: `visita-${v._chaveBase}`,
                    });
                });

                if (inadimplentesNovos.length > 0 || visitasIminentesNovas.length > 0 || visitasDiaNovas.length > 0) {
                    if (inadimplentes.length > 0) {
                        setBannerCritico(true);
                        if (inadimplentesNovos.length > 0) {
                            const nomesNovos = inadimplentesNovos.map((n) => n.nome).join(", ");
                            setMensagemBanner(
                                inadimplentes.length === 1
                                    ? `1 locatário em atraso: ${inadimplentes[0].nome}.`
                                    : `${inadimplentes.length} locatários em atraso no total (novo: ${nomesNovos}).`
                            );
                        } else {
                            setMensagemBanner(
                                inadimplentes.length === 1
                                    ? `1 locatário em atraso: ${inadimplentes[0].nome}.`
                                    : `${inadimplentes.length} locatários com atraso pendente.`
                            );
                        }
                    } else if (visitasIminentesNovas.length > 0) {
                        const primeira = visitasIminentesNovas[0];
                        const cliente = primeira.clientName || primeira.nomeCliente || "Cliente";
                        setBannerCritico(true);
                        setMensagemBanner(
                            visitasIminentesNovas.length === 1
                                ? `Visita em breve (${primeira._horaFormatada}) com ${cliente}.`
                                : `${visitasIminentesNovas.length} visitas próximas do horário marcado.`
                        );
                    } else {
                        setBannerCritico(false);
                        setMensagemBanner(
                            `Você tem ${filtradasVisitas.length} ${
                                filtradasVisitas.length === 1 ? "visita agendada para hoje" : "visitas agendadas para hoje"
                            }.`
                        );
                    }
                    setBannerAberto(true);

                    if (itensNotificacaoNativa.length > 0) {
                        const rodar = () => {
                            itensNotificacaoNativa.forEach((item) => {
                                notificarSistema(item.titulo, item.corpo, item.tag, (t, b) => {
                                    setMensagemBanner(`${t}: ${b}`);
                                    setBannerAberto(true);
                                });
                            });
                        };

                        if (typeof Notification !== "undefined" && Notification.permission === "default") {
                            Notification.requestPermission().finally(() => {
                                if (ativo) rodar();
                            });
                        } else {
                            rodar();
                        }
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar notificações:", err);
            }
        }

        verificarNotificacoes();
        const intervalo = setInterval(verificarNotificacoes, 60000);
        const aoAtualizar = () => verificarNotificacoes();
        window.addEventListener("locus:locatarios-atualizados", aoAtualizar);

        return () => {
            ativo = false;
            clearInterval(intervalo);
            window.removeEventListener("locus:locatarios-atualizados", aoAtualizar);
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setMostrarDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const totalNotificacoes = visitasHoje.length + alertasAtraso.length;
    const temUrgencia = alertasAtraso.length > 0 || visitasHoje.some((v) => v._iminente);

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
                                    type="button"
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
                                    {totalNotificacoes > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-3px',
                                            right: '-3px',
                                            backgroundColor: temUrgencia ? '#dc2626' : '#ef4444',
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
                                            {totalNotificacoes}
                                        </span>
                                    )}
                                </button>

                                {mostrarDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '40px',
                                        width: '330px',
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
                                            <span>Notificações ({alertasAtraso.length} atraso{alertasAtraso.length === 1 ? '' : 's'})</span>
                                            <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                                {totalNotificacoes}
                                            </span>
                                        </div>

                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {totalNotificacoes === 0 ? (
                                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                                    Nenhuma notificação no momento.
                                                </div>
                                            ) : (
                                                <>
                                                    {alertasAtraso.map((l) => (
                                                        <div
                                                            key={`atraso-${l.id}`}
                                                            style={{
                                                                padding: '10px 14px',
                                                                borderBottom: '1px solid #fee2e2',
                                                                backgroundColor: '#fef2f2',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '3px'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#b91c1c', fontWeight: '700' }}>
                                                                <AlertTriangle size={12} /> Locatário em atraso
                                                            </div>
                                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#7f1d1d' }}>
                                                                {l.nome}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#991b1b' }}>
                                                                Imóvel: {l.imovel}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {visitasHoje.map((v) => (
                                                        <div
                                                            key={`visita-${v._chaveBase}`}
                                                            style={{
                                                                padding: '10px 14px',
                                                                borderBottom: '1px solid #f1f5f9',
                                                                backgroundColor: v._iminente ? '#fff7ed' : '#ffffff',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '3px'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '5px',
                                                                    fontSize: '11px',
                                                                    color: v._iminente ? '#c2410c' : '#2563eb',
                                                                    fontWeight: '600'
                                                                }}
                                                            >
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <Clock size={12} /> {v._horaFormatada}
                                                                </span>
                                                                {v._iminente && (
                                                                    <span
                                                                        style={{
                                                                            backgroundColor: '#ffedd5',
                                                                            color: '#c2410c',
                                                                            padding: '1px 6px',
                                                                            borderRadius: '8px',
                                                                            fontSize: '10px'
                                                                        }}
                                                                    >
                                                                        {v._minutosAte > 0 ? `Em ${v._minutosAte} min` : "Na hora"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>
                                                                Cliente: {v.clientName || v.nomeCliente || "Cliente"}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                                Imóvel: {v.propertyTitle || v.imovel || "—"}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
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

            {bannerAberto && totalNotificacoes > 0 && (
                <div
                    role="status"
                    style={{
                        position: "fixed",
                        bottom: "20px",
                        right: "20px",
                        width: "330px",
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                        borderLeft: `4px solid ${bannerCritico ? "#dc2626" : "#1877f2"}`,
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
                        borderTop: "1px solid #e2e8f0",
                        borderRight: "1px solid #e2e8f0",
                        borderBottom: "1px solid #e2e8f0",
                        padding: "14px 16px",
                        zIndex: 99998,
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong style={{ fontSize: "13px", color: bannerCritico ? "#b91c1c" : "#1877f2" }}>
                            {bannerCritico ? `Alerta do Sistema (${alertasAtraso.length} atraso${alertasAtraso.length === 1 ? '' : 's'})` : `Notificações (${totalNotificacoes})`}
                        </strong>
                        <button
                            type="button"
                            onClick={() => setBannerAberto(false)}
                            aria-label="Fechar notificação"
                            style={{
                                background: "none",
                                border: "none",
                                color: "#64748b",
                                cursor: "pointer",
                                padding: "2px",
                                display: "flex",
                            }}
                        >
                            <X size={15} />
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#334155" }}>
                        {mensagemBanner} Clique no sino para ver os detalhes.
                    </p>
                </div>
            )}
        </>
    );
}

export default AppLayout;