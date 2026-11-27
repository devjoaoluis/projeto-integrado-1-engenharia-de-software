import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FilePlus2,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "./auth/AuthContext";

const HomeCharts = lazy(() => import("./components/HomeCharts.jsx"));

const resourceKeys = ["properties", "contracts", "payments", "visits"];
const initialResource = { status: "loading", data: [], error: "" };

function fetchResource(key) {
  const requests = {
    properties: () => window.api.properties.list(),
    contracts: () => window.api.rentals.listContractHistory(),
    payments: () => window.api.payments.list(),
    visits: () => window.api.visits.upcoming(8),
  };
  return requests[key]();
}

function getTimestamp(value) {
  if (value == null || value === "") return null;
  const timestamp = typeof value === "number" && value < 1_000_000_000_000
    ? value * 1000
    : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDate(value) {
  const timestamp = getTimestamp(value);
  return timestamp == null
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(timestamp);
}

function formatContractStatus(status) {
  const labels = {
    ACTIVE: "ativo",
    ENDED: "encerrado",
    CANCELLED: "cancelado",
    CANCELED: "cancelado",
    PENDING: "pendente",
    SCHEDULED: "agendado",
  };
  return `Contrato ${labels[String(status || "").toUpperCase()] || "registrado"}`;
}

function isOverdue(payment, now = Date.now()) {
  const status = String(payment.status || "").toUpperCase();
  if (["ATRASADO", "OVERDUE"].includes(status)) return true;
  if (!["PENDENTE", "PENDING", "EM_ABERTO"].includes(status)) return false;
  const dueDate = getTimestamp(payment.dueDate ?? payment.dueAt ?? payment.vencimento);
  return dueDate != null && dueDate < now;
}

function Skeleton({ rows = 2 }) {
  return (
    <div className="home-skeleton" aria-label="Carregando" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function SectionError({ message, onRetry }) {
  return (
    <div className="home-erro-secao" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={15} aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}

function Home() {
  const { user } = useAuth();
  const [resources, setResources] = useState({
    properties: { ...initialResource },
    contracts: { ...initialResource },
    payments: { ...initialResource },
    visits: { ...initialResource },
  });
  const loadResource = useCallback(async (key) => {
    setResources((current) => ({
      ...current,
      [key]: { ...current[key], status: "loading", error: "" },
    }));
    try {
      const response = await fetchResource(key);
      if (!Array.isArray(response)) {
        throw new Error(`Resposta inválida ao carregar ${key}.`);
      }
      setResources((current) => ({
        ...current,
        [key]: { status: "success", data: response, error: "" },
      }));
    } catch (error) {
      console.error(`Não foi possível carregar ${key} na Home:`, error);
      setResources((current) => ({
        ...current,
        [key]: {
          ...current[key],
          status: "error",
          error: "Não foi possível carregar estes dados.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    resourceKeys.forEach((key) => {
      void loadResource(key);
    });
  }, [loadResource]);

  const propertyData = resources.properties.data;
  const contractData = resources.contracts.data;
  const paymentData = resources.payments.data;
  const visitData = resources.visits.data;
  const activeContracts = contractData.filter(
    (contract) => String(contract.status).toUpperCase() === "ACTIVE"
  ).length;
  const availableProperties = propertyData.filter(
    (property) => String(property.status).toUpperCase() === "DISPONIVEL"
  ).length;
  const overduePayments = paymentData.filter((payment) => isOverdue(payment));

  const pendingItems = useMemo(() => {
    const now = Date.now();
    const paymentItems = paymentData
      .filter((payment) => {
        const status = String(payment.status || "").toUpperCase();
        return isOverdue(payment, now) || ["PENDENTE", "PENDING", "EM_ABERTO"].includes(status);
      })
      .sort((left, right) => {
        const leftOverdue = isOverdue(left, now);
        const rightOverdue = isOverdue(right, now);
        if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
        return (getTimestamp(left.dueDate) ?? 0) - (getTimestamp(right.dueDate) ?? 0);
      })
      .slice(0, 4)
      .map((payment) => {
        const daysLate = Math.max(
          payment.daysOverdue || 0,
          Math.floor((now - (getTimestamp(payment.dueDate) ?? now)) / 86_400_000)
        );
        return {
          id: payment.id,
          title: `${payment.tenantName || "Locatário"} · ${payment.propertyTitle || "Imóvel"}`,
          detail: isOverdue(payment, now)
            ? `${daysLate} dia(s) em atraso${daysLate >= 90 ? " · atenção jurídica" : ""}`
            : `Vencimento ${formatDate(payment.dueDate)}`,
          target: `/pagamentos?tenantId=${encodeURIComponent(payment.tenantId || payment.clientId || "")}`,
          priority: isOverdue(payment, now) ? "overdue" : "pending",
          date: getTimestamp(payment.dueDate) ?? now,
        };
      });

    const visitItems = visitData.slice(0, 4).map((visit) => ({
      id: visit.id,
      title: `Visita · ${visit.clientName || "Cliente"} · ${visit.propertyTitle || "Imóvel"}`,
      detail: formatDate(visit.scheduledAt),
      target: `/visitas?visitId=${encodeURIComponent(visit.id)}`,
      priority: "visit",
      date: getTimestamp(visit.scheduledAt) ?? now,
    }));

    return [...paymentItems, ...visitItems].sort((a, b) => {
      const weight = { overdue: 0, pending: 1, visit: 2 };
      return weight[a.priority] - weight[b.priority] || a.date - b.date;
    }).slice(0, 6);
  }, [paymentData, visitData]);

  const recentActivities = useMemo(() => {
    const properties = propertyData.map((property) => ({
      id: `property:${property.id}`,
      title: property.title || property.address || "Imóvel cadastrado",
      detail: "Imóvel",
      date: getTimestamp(property.createdAt),
      target: property.id ? `/imoveis/${property.id}` : "/imoveis",
    }));
    const contracts = contractData.map((contract) => {
      const property = propertyData.find((item) => item.id === contract.propertyId);
      const propertyName = property?.title || property?.address;
      const tenantName = contract.tenantName || contract.tenant?.name;

      return {
        id: `contract:${contract.id}`,
        title: tenantName && propertyName
          ? `${tenantName} — ${propertyName}`
          : tenantName || propertyName || "Contrato cadastrado",
        detail: formatContractStatus(contract.status),
        date: getTimestamp(contract.createdAt),
        target: contract.propertyId ? `/imoveis/${contract.propertyId}` : "/contratos",
      };
    });
    return [...properties, ...contracts]
      .filter((item) => item.date != null)
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
  }, [propertyData, contractData]);

  const greetingName = user?.name || user?.nome || user?.email?.split("@")[0] || "corretora";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const metrics = [
    {
      label: "Imóveis cadastrados",
      value: propertyData.length,
      detail: `${availableProperties} disponível(is)`,
      icon: Building2,
      target: "/imoveis",
      resource: resources.properties,
    },
    {
      label: "Contratos ativos",
      value: activeContracts,
      detail: "Locações em andamento",
      icon: FileCheck2,
      target: "/contratos",
      resource: resources.contracts,
    },
    {
      label: "Parcelas em atraso",
      value: overduePayments.length,
      detail: "Exigem acompanhamento",
      icon: Wallet,
      target: "/pagamentos",
      resource: resources.payments,
    },
    {
      label: "Próximas visitas",
      value: visitData.length,
      detail: "Visitas agendadas",
      icon: CalendarDays,
      target: "/visitas",
      resource: resources.visits,
    },
  ];

  return (
    <div className="home-dashboard">
      <style>{`
        .home-dashboard { width: 100%; max-width: 1440px; margin: 0 auto; color: var(--color-on-surface); }
        .home-welcome { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--space-4); margin-bottom: 22px; }
        .home-welcome h2 { margin: 0 0 var(--space-1); font-size: clamp(22px, 3vw, 29px); }
        .home-welcome p { margin: 0; color: var(--color-on-surface-variant); font-size: var(--font-body-md); }
        .home-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: var(--space-3); }
        .home-metric { min-width: 0; padding: var(--space-4); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); background: var(--color-surface); color: inherit; text-decoration: none; box-shadow: var(--elevation-2); }
        .home-metric:hover, .home-metric:focus-visible { border-color: var(--color-outline-variant); outline: 2px solid var(--color-primary); outline-offset: 1px; }
        .home-metric-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
        .home-metric-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: var(--radius-md); background: var(--color-primary-container); color: var(--color-primary); }
        .home-metric-label { margin-top: 15px; color: var(--color-on-surface-variant); font-size: var(--font-body-md); }
        .home-metric-value { display: block; margin-top: 3px; font-size: var(--font-headline-md); line-height: 1.15; font-weight: 750; color: var(--color-on-surface); }
        .home-metric-detail { display: block; margin-top: 5px; color: var(--color-on-surface-variant); font-size: var(--font-body-sm); }
        .home-card { min-width: 0; padding: var(--space-4); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); background: var(--color-surface); }
        .home-section { margin-top: 22px; }
        .home-section-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: 12px; }
        .home-section-header h3 { margin: 0; color: var(--color-on-surface); font-size: var(--font-body-lg); }
        .home-section-header a, .home-quick-action { color: var(--color-primary); text-decoration: none; font-size: var(--font-body-md); font-weight: 650; }
        .home-quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 185px), 1fr)); gap: var(--space-2); }
        .home-quick-action { min-height: 54px; display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); background: var(--color-surface-variant); }
        .home-quick-action:hover, .home-quick-action:focus-visible { border-color: var(--color-outline-variant); background: var(--color-surface-container); outline: 2px solid var(--color-primary); outline-offset: 1px; }
        .home-pending-list, .home-recent-list { display: flex; flex-direction: column; }
        .home-list-item { min-height: 60px; display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-1); border-bottom: 1px solid var(--color-outline-variant); color: inherit; text-decoration: none; }
        .home-list-item:last-child { border-bottom: 0; }
        .home-list-item:hover .home-list-title { color: var(--color-primary); }
        .home-list-copy { min-width: 0; }
        .home-list-title { display: block; overflow: hidden; color: var(--color-on-surface); font-size: var(--font-body-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        .home-list-detail { display: block; margin-top: 4px; color: var(--color-on-surface-variant); font-size: var(--font-body-sm); }
        .home-status { flex: 0 0 auto; padding: var(--space-1) var(--space-2); border-radius: var(--radius-xl); font-size: var(--font-body-sm); font-weight: 700; }
        .home-status-overdue { color: var(--color-error); background: var(--color-error-container); }
        .home-status-pending { color: var(--color-warning); background: var(--color-warning-container); }
        .home-status-visit { color: var(--color-on-surface); background: var(--color-primary-container); }
        .home-empty { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-5) var(--space-3); color: var(--color-on-surface-variant); text-align: center; }
        .home-empty a { display: inline-flex; min-height: 44px; align-items: center; gap: var(--space-1); margin-top: 4px; color: var(--color-primary); font-weight: 650; text-decoration: none; }
        .home-skeleton { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0; }
        .home-skeleton span { height: 14px; width: 100%; border-radius: var(--radius-sm); background: linear-gradient(90deg, var(--color-primary-container) 25%, var(--color-primary-container) 45%, var(--color-primary-container) 65%); background-size: 300% 100%; animation: home-shimmer 1.4s ease infinite; }
        .home-skeleton span:last-child { width: 62%; }
        @keyframes home-shimmer { to { background-position: -150% 0; } }
        .home-erro-secao { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); color: var(--color-error); font-size: var(--font-body-md); }
        .home-erro-secao p { margin: 0; }
        .home-erro-secao button { min-height: 44px; display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-2) var(--space-3); border: 1px solid var(--color-error); border-radius: var(--radius-sm); color: var(--color-error); background: var(--color-surface); cursor: pointer; }
        .home-analytics { margin-top: 22px; border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); background: var(--color-surface-variant); }
        .home-analytics h3 { margin: 0; padding: var(--space-4) var(--space-4) 0; color: var(--color-on-surface); font-size: var(--font-body-lg); }
        .home-analytics-body { padding: var(--space-3); }
        @media (max-width: 620px) {
          .home-welcome { align-items: flex-start; flex-direction: column; }
          .home-list-item { align-items: flex-start; }
          .home-erro-secao { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <header className="home-welcome">
        <div>
          <h2>{greeting}, {greetingName}</h2>
          <p>Veja o que precisa de atenção na sua carteira hoje.</p>
        </div>
      </header>

      <section aria-label="Indicadores principais" className="home-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link className="home-metric" to={metric.target} key={metric.label}>
              <div className="home-metric-head">
                <span className="home-metric-icon"><Icon size={21} aria-hidden="true" /></span>
                <ArrowRight size={17} aria-hidden="true" color="var(--color-primary)" />
              </div>
              <span className="home-metric-label">{metric.label}</span>
              {metric.resource.status === "loading" ? (
                <Skeleton rows={1} />
              ) : metric.resource.status === "error" ? (
                <>
                  <strong className="home-metric-value">—</strong>
                  <span className="home-metric-detail">Dados indisponíveis · tente novamente abaixo</span>
                </>
              ) : (
                <>
                  <strong className="home-metric-value">{metric.value}</strong>
                  <span className="home-metric-detail">{metric.detail}</span>
                </>
              )}
            </Link>
          );
        })}
      </section>

      <section className="home-analytics" aria-labelledby="home-analytics-title">
        <h3 id="home-analytics-title">Análises da carteira · gráficos existentes</h3>
        <div className="home-analytics-body">
          {resources.properties.status === "error" || resources.contracts.status === "error" ? (
            <SectionError
              message="Não foi possível carregar os dados das análises."
              onRetry={() => {
                void loadResource("properties");
                void loadResource("contracts");
              }}
            />
          ) : resources.properties.status === "loading" || resources.contracts.status === "loading" ? (
            <Skeleton rows={4} />
          ) : (
            <Suspense fallback={<Skeleton rows={4} />}>
              <HomeCharts properties={propertyData} contracts={contractData} />
            </Suspense>
          )}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-quick-title">
        <div className="home-section-header"><h3 id="home-quick-title">Ações rápidas</h3></div>
        <nav className="home-quick-grid" aria-label="Ações rápidas">
          <Link className="home-quick-action" to="/imoveis/cadastrar"><FilePlus2 size={19} aria-hidden="true" />Cadastrar imóvel</Link>
          <Link className="home-quick-action" to="/visitas"><CalendarDays size={19} aria-hidden="true" />Agendar visita</Link>
          <Link className="home-quick-action" to="/contratos"><FileCheck2 size={19} aria-hidden="true" />Consultar contratos</Link>
          <Link className="home-quick-action" to="/pagamentos"><Wallet size={19} aria-hidden="true" />Registrar pagamento</Link>
          <Link className="home-quick-action" to="/locatarios"><Users size={19} aria-hidden="true" />Consultar locatários</Link>
        </nav>
      </section>

      <section className="home-section" aria-labelledby="home-pending-title">
        <div className="home-section-header">
          <h3 id="home-pending-title">Pendências e próximos compromissos</h3>
          <Link to="/pagamentos">Ver pagamentos <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <div className="home-card home-pending-list">
          {resources.payments.status === "error" && (
            <SectionError
              message={resources.payments.error}
              onRetry={() => void loadResource("payments")}
            />
          )}
          {resources.visits.status === "error" && (
            <SectionError
              message="Não foi possível carregar as próximas visitas."
              onRetry={() => void loadResource("visits")}
            />
          )}
          {(resources.payments.status === "loading" || resources.visits.status === "loading") && (
            <Skeleton rows={3} />
          )}
          {resources.payments.status === "success" && resources.visits.status === "success" && pendingItems.length === 0 && (
            <div className="home-empty">
              <CheckCircle2 size={25} aria-hidden="true" color="var(--color-success)" />
              <strong>Nenhuma pendência urgente.</strong>
              <span>Os próximos compromissos e parcelas aparecerão aqui.</span>
              <Link to="/pagamentos">Acessar pagamentos <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          )}
          {pendingItems.map((item) => (
            <Link className="home-list-item" to={item.target} key={`${item.priority}:${item.id}`}>
              <span className="home-list-copy">
                <span className="home-list-title">{item.title}</span>
                <span className="home-list-detail">{item.detail}</span>
              </span>
              <span className={`home-status home-status-${item.priority}`}>
                {item.priority === "overdue" ? <><AlertTriangle size={12} aria-hidden="true" /> Atrasado</> :
                  item.priority === "pending" ? "Pendente" : <><Clock3 size={12} aria-hidden="true" /> Visita</>}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-recent-title">
        <div className="home-section-header">
          <h3 id="home-recent-title">Atividade recente</h3>
          <Link to="/contratos">Ver contratos <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <div className="home-card home-recent-list">
          {(resources.properties.status === "loading" || resources.contracts.status === "loading") && (
            <Skeleton rows={3} />
          )}
          {resources.properties.status === "error" && (
            <SectionError
              message="Não foi possível carregar imóveis recentes."
              onRetry={() => void loadResource("properties")}
            />
          )}
          {resources.contracts.status === "error" && (
            <SectionError
              message="Não foi possível carregar contratos recentes."
              onRetry={() => void loadResource("contracts")}
            />
          )}
          {resources.properties.status === "success" && resources.contracts.status === "success" && recentActivities.length === 0 && (
            <div className="home-empty">
              <Building2 size={25} aria-hidden="true" />
              <strong>Ainda não há atividade registrada.</strong>
              <span>Cadastre um imóvel ou contrato para começar.</span>
              <Link to="/imoveis/cadastrar">Cadastrar imóvel <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          )}
          {recentActivities.map((activity) => (
            <Link className="home-list-item" to={activity.target} key={activity.id}>
              <span className="home-list-copy">
                <span className="home-list-title">{activity.title}</span>
                <span className="home-list-detail">{activity.detail}</span>
              </span>
              <time className="home-list-detail" dateTime={new Date(activity.date).toISOString()}>
                {formatDate(activity.date)}
              </time>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

export default Home;
