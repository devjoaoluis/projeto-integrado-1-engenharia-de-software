import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox, Moon, Sun, Trash2, X } from "lucide-react";
import { Sidebar } from "../components/Sidebar";

const AVISO_NOTIFICACOES_NATIVAS = "locus:notificacoes-nativas-indisponiveis";

function construirBreadcrumb(pathname) {
  const painel = { label: "Painel", to: "/home" };

  if (pathname === "/home") return [{ label: "Painel" }];
  if (pathname === "/imoveis") return [painel, { label: "Imóveis" }];
  if (pathname === "/imoveis/cadastrar") {
    return [painel, { label: "Imóveis", to: "/imoveis" }, { label: "Novo imóvel" }];
  }
  if (pathname.startsWith("/imoveis/")) {
    return [painel, { label: "Imóveis", to: "/imoveis" }, { label: "Detalhes" }];
  }
  if (pathname === "/locatarios") return [painel, { label: "Locatários" }];
  if (pathname.startsWith("/locatarios/")) {
    return [painel, { label: "Locatários", to: "/locatarios" }, { label: "Detalhes" }];
  }

  const paginas = {
    "/contatos": "Contatos",
    "/contratos": "Contratos",
    "/pagamentos": "Pagamentos",
    "/visitas": "Visitas",
    "/vistorias": "Vistorias",
  };
  return paginas[pathname]
    ? [painel, { label: paginas[pathname] }]
    : [{ label: "Painel" }];
}

function formatarData(timestamp) {
  const data = new Date(timestamp);
  if (Number.isNaN(data.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const breadcrumb = construirBreadcrumb(pathname);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const [theme, setTheme] = useState(() => (
    document.documentElement.dataset.theme === "dark" ? "dark" : "light"
  ));
  const dropdownRef = useRef(null);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      localStorage.setItem("locus:theme", nextTheme);
    } catch (storageError) {
      console.error("Não foi possível salvar a preferência de tema:", storageError);
      setError("Tema alterado, mas não foi possível salvar essa preferência.");
    }
  }

  const refreshNotifications = useCallback(async () => {
    try {
      const items = await window.api.notifications.list();
      setNotifications(Array.isArray(items) ? items : []);
      setError("");
    } catch (loadError) {
      console.error("Não foi possível carregar as notificações:", loadError);
      setError("Não foi possível carregar o histórico de notificações.");
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
    const unsubscribe = window.api.notifications.onChanged(() => {
      void refreshNotifications();
    });
    const unsubscribeUnavailable = window.api.notifications.onNativeUnavailable(() => {
      try {
        if (localStorage.getItem(AVISO_NOTIFICACOES_NATIVAS) === "1") return;
        localStorage.setItem(AVISO_NOTIFICACOES_NATIVAS, "1");
        setNativeUnavailable(true);
      } catch (storageError) {
        console.error("Não foi possível salvar a preferência de aviso:", storageError);
        setNativeUnavailable(true);
      }
    });
    return () => {
      unsubscribe();
      unsubscribeUnavailable();
    };
  }, [refreshNotifications]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const unreadCount = notifications.reduce(
    (count, item) => count + (item.readAt == null ? 1 : 0),
    0
  );

  async function openNotification(id) {
    try {
      const item = await window.api.notifications.open(id);
      if (item?.target) navigate(item.target);
      setShowDropdown(false);
    } catch (openError) {
      console.error("Não foi possível abrir a notificação:", openError);
      setError("Não foi possível abrir este item. Tente novamente.");
    }
  }

  async function markAsRead(id) {
    try {
      await window.api.notifications.markRead(id);
    } catch (markError) {
      console.error("Não foi possível marcar a notificação como lida:", markError);
      setError("Não foi possível atualizar o estado da notificação.");
    }
  }

  async function markAllAsRead() {
    try {
      await window.api.notifications.markAllRead();
    } catch (markError) {
      console.error("Não foi possível marcar as notificações como lidas:", markError);
      setError("Não foi possível atualizar as notificações.");
    }
  }

  async function deleteNotification(id) {
    try {
      await window.api.notifications.delete(id);
    } catch (deleteError) {
      console.error("Não foi possível excluir a notificação:", deleteError);
      setError("Não foi possível excluir esta notificação.");
    }
  }

  async function clearNotifications() {
    try {
      await window.api.notifications.clear();
    } catch (clearError) {
      console.error("Não foi possível limpar as notificações:", clearError);
      setError("Não foi possível limpar o histórico.");
    }
  }

  return (
    <>
      <style>{`
        .layout { display: flex; height: 100vh; overflow: hidden; }
        .principal { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; min-width: 0; }
        .topo { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); background: var(--color-primary); color: var(--color-on-primary); padding: var(--space-3) var(--space-5); position: sticky; top: 0; z-index: 10; flex-shrink: 0; }
        .topo-identidade, .topo-icones { display: flex; align-items: center; gap: var(--space-3); }
        .topo-identidade { min-width: 0; }
        .breadcrumb { min-width: 0; }
        .breadcrumb ol { display: flex; align-items: center; gap: var(--space-2); list-style: none; min-width: 0; }
        .breadcrumb li { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
        .breadcrumb a { color: inherit; opacity: 0.76; text-decoration: none; transition: opacity var(--motion-fast) var(--ease-standard); }
        .breadcrumb a:hover { opacity: 1; text-decoration: underline; }
        .breadcrumb-current { overflow: hidden; font-size: var(--font-title-lg); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        .breadcrumb-separator { opacity: 0.65; }
        .conteudo { flex: 1; background: var(--color-surface); padding: var(--space-5); min-width: 0; }
        .topo-acao { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; position: relative; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-on-primary); cursor: pointer; }
        .topo-acao:hover, .topo-acao:focus-visible { background: var(--state-layer-on-primary); outline: 2px solid var(--color-outline-variant); outline-offset: 2px; }
        .notificacoes-dropdown { position: absolute; top: 52px; right: 0; width: min(390px, calc(100vw - 32px)); max-height: min(70vh, 560px); overflow: hidden; color: var(--color-on-surface); background: var(--color-surface); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); box-shadow: var(--elevation-2); z-index: 100; text-align: left; }
        .notificacoes-cabecalho { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-outline-variant); background: var(--color-surface-variant); display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
        .notificacoes-cabecalho strong { font-size: var(--font-body-md); }
        .notificacoes-acoes { display: flex; gap: var(--space-1); }
        .notificacoes-acoes button, .notificacao-excluir { min-width: 40px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: var(--radius-sm); color: var(--color-primary); background: transparent; cursor: pointer; }
        .notificacao-acoes-item { display: flex; flex-direction: column; align-items: center; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: calc(-1 * var(--space-1)); overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .notificacoes-acoes button:hover, .notificacao-excluir:hover { color: var(--color-primary); background: var(--color-surface-variant); }
        .notificacoes-lista { max-height: 390px; overflow-y: auto; }
        .notificacoes-vazio { padding: var(--space-6) var(--space-4); text-align: center; color: var(--color-on-surface-variant); }
        .notificacoes-vazio svg { color: var(--color-primary); margin-bottom: 8px; }
        .notificacao-item { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: var(--space-1); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-outline-variant); }
        .notificacao-item-nao-lida { background: var(--color-primary-container); }
        .notificacao-conteudo { width: 100%; padding: var(--space-1) var(--space-1); border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
        .notificacao-conteudo:focus-visible, .notificacao-excluir:focus-visible, .notificacoes-acoes button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .notificacao-titulo { display: block; font-size: var(--font-body-md); font-weight: 700; color: var(--color-on-surface); }
        .notificacao-mensagem { display: block; margin-top: 3px; font-size: var(--font-body-sm); line-height: 1.45; color: var(--color-on-surface-variant); overflow-wrap: anywhere; }
        .notificacao-data { display: block; margin-top: 6px; font-size: var(--font-body-sm); color: var(--color-on-surface-variant); }
        .notificacoes-aviso, .notificacoes-erro { margin: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-body-sm); line-height: 1.45; }
        .notificacoes-aviso { color: var(--color-warning); background: var(--color-warning-container); border: 1px solid var(--color-warning); }
        .notificacoes-erro { color: var(--color-error); background: var(--color-error-container); border: 1px solid var(--color-error); }
        @media (max-width: 680px) {
          .topo { padding: var(--space-2) var(--space-3); }
          .breadcrumb ol { gap: var(--space-1); }
          .breadcrumb li { gap: var(--space-1); }
          .conteudo { padding: var(--space-4); }
          .notificacoes-dropdown { right: -54px; }
        }
        @media (max-width: 520px) {
          .layout { display: block; height: auto; min-height: 100vh; overflow: visible; }
          .layout > aside { width: 100% !important; height: auto !important; min-height: 0 !important; padding: var(--space-3) !important; position: relative !important; }
          .layout > aside h2 { margin: 0 0 var(--space-2) !important; padding-right: 60px; font-size: var(--font-title-lg) !important; }
          .layout > aside nav { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-1) !important; }
          .layout > aside nav a { min-height: 44px; justify-content: center; gap: var(--space-1) !important; padding: var(--space-1) !important; flex-direction: column; font-size: var(--font-body-sm) !important; text-align: center; }
          .layout > aside > button { min-height: 44px; width: auto !important; padding: var(--space-2) !important; position: absolute; top: 8px; right: 12px; }
          .principal { height: auto; min-height: 100vh; overflow: visible; }
          .conteudo { padding: var(--space-3); }
        }
      `}</style>

      <div className="layout">
        <Sidebar />
        <div className="principal">
          <header className="topo">
            <div className="topo-identidade">
              <nav className="breadcrumb" aria-label="Navegação estrutural">
                <ol>
                  {breadcrumb.map((item, index) => {
                    const atual = index === breadcrumb.length - 1;
                    return (
                      <li key={`${item.label}-${index}`}>
                        {index > 0 && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
                        {item.to && !atual ? (
                          <Link to={item.to}>{item.label}</Link>
                        ) : (
                          <span className="breadcrumb-current" aria-current="page">{item.label}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
            <div className="topo-icones">
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  type="button"
                  className="topo-acao"
                  onClick={() => setShowDropdown((visible) => !visible)}
                  aria-label={`Notificações, ${unreadCount} não lidas`}
                  aria-expanded={showDropdown}
                  aria-controls="notificacoes-dropdown"
                >
                  <Bell size={20} aria-hidden="true" />
                  <span className="sr-only" aria-live="polite">
                    {unreadCount} notificações não lidas
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="notificacoes-badge"
                      style={{
                        position: "absolute",
                        top: 1,
                        right: 0,
                        minWidth: 18,
                        height: 18,
                        padding: "0 var(--space-1)",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 9,
                        background: "var(--color-error)",
                        color: "var(--color-on-error)",
                        border: "2px solid var(--color-surface)",
                        fontSize: "var(--font-body-sm)",
                        fontWeight: 700,
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {showDropdown && (
                  <section
                    id="notificacoes-dropdown"
                    className="notificacoes-dropdown"
                    aria-label="Central de notificações"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setShowDropdown(false);
                    }}
                  >
                    <div className="notificacoes-cabecalho">
                      <strong>Notificações</strong>
                      <div className="notificacoes-acoes">
                        <button
                          type="button"
                          aria-label="Marcar todas como lidas"
                          title="Marcar todas como lidas"
                          onClick={markAllAsRead}
                          disabled={unreadCount === 0}
                        >
                          <CheckCheck size={18} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Limpar histórico de notificações"
                          title="Limpar histórico"
                          onClick={clearNotifications}
                          disabled={notifications.length === 0}
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Fechar notificações"
                          title="Fechar"
                          onClick={() => setShowDropdown(false)}
                        >
                          <X size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {nativeUnavailable && (
                      <div className="notificacoes-aviso" role="status">
                        As notificações do Windows não estão disponíveis. Ative-as em
                        Configurações do Windows &gt; Sistema &gt; Notificações. Os eventos
                        continuam salvos aqui.
                      </div>
                    )}
                    {error && <div className="notificacoes-erro" role="alert">{error}</div>}

                    <div className="notificacoes-lista">
                      {notifications.length === 0 ? (
                        <div className="notificacoes-vazio">
                          <Inbox size={25} aria-hidden="true" />
                          <div>Nenhuma notificação por enquanto.</div>
                          <small>Os lembretes importantes aparecerão aqui.</small>
                        </div>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {notifications.map((item) => (
                            <li
                              className={`notificacao-item ${item.readAt == null ? "notificacao-item-nao-lida" : ""}`}
                              key={item.id}
                            >
                              <button
                                type="button"
                                className="notificacao-conteudo"
                                onClick={() => openNotification(item.id)}
                              >
                                <span className="notificacao-titulo">{item.title}</span>
                                <span className="notificacao-mensagem">{item.message}</span>
                                <span className="notificacao-data">{formatarData(item.createdAt)}</span>
                              </button>
                              <div className="notificacao-acoes-item">
                                {item.readAt == null && (
                                  <button
                                    type="button"
                                    className="notificacao-excluir"
                                    aria-label={`Marcar como lida: ${item.title}`}
                                    title="Marcar como lida"
                                    onClick={() => markAsRead(item.id)}
                                  >
                                    <CheckCheck size={17} aria-hidden="true" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="notificacao-excluir"
                                  aria-label={`Excluir notificação: ${item.title}`}
                                  title="Excluir notificação"
                                  onClick={() => deleteNotification(item.id)}
                                >
                                  <X size={17} aria-hidden="true" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                )}
              </div>
              <button
                type="button"
                className="topo-acao"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
                aria-pressed={theme === "dark"}
                title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              >
                {theme === "dark" ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
              </button>
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
