
import { useState, useEffect, useRef } from "react";
import { Bell, X, CalendarDays } from "lucide-react";

function NotificationBell() {
    const [aberto, setAberto] = useState(false);
    const containerRef = useRef(null);

    // Fecha o painel ao clicar fora dele
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setAberto(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setAberto(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <>
            <style>
                {`
                    .notificacoes-container {
                        position: relative;
                    }

                    .botao-notificacao {
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 6px;
                        transition: background 0.2s;
                    }

                    .botao-notificacao:hover {
                        background: rgba(255, 255, 255, 0.15);
                    }

                    .painel-notificacoes {
                        position: absolute;
                        top: calc(100% + 14px);
                        right: 0;
                        width: 350px;
                        background: white;
                        color: #333;
                        border-radius: 10px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
                        z-index: 1000;
                        overflow: hidden;
                    }

                    .notificacoes-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px;
                        border-bottom: 1px solid #eeeeee;
                    }

                    .notificacoes-header h3 {
                        font-size: 17px;
                        font-weight: 600;
                        margin: 0;
                    }

                    .notificacoes-header button {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: transparent;
                        border: none;
                        cursor: pointer;
                        color: #666;
                        padding: 5px;
                        border-radius: 5px;
                    }

                    .notificacoes-header button:hover {
                        background: #f1f1f1;
                    }

                    .notificacoes-vazias {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 35px 20px;
                        text-align: center;
                        color: #888;
                    }

                    .notificacoes-vazias svg {
                        color: #a0a0a0;
                        margin-bottom: 12px;
                    }

                    .notificacoes-vazias p {
                        font-size: 14px;
                        margin: 0;
                    }

                    @media (max-width: 480px) {
                        .painel-notificacoes {
                            width: min(320px, calc(100vw - 30px));
                            right: -10px;
                        }
                    }
                `}
            </style>

            <div className="notificacoes-container" ref={containerRef}>
                <button
                    className="botao-notificacao"
                    onClick={() => setAberto((anterior) => !anterior)}
                    aria-label="Abrir notificações"
                    aria-expanded={aberto}
                    title="Notificações"
                >
                    <Bell size={20} />
                </button>

                {aberto && (
                    <div
                        className="painel-notificacoes"
                        role="dialog"
                        aria-label="Painel de notificações"
                    >
                        <div className="notificacoes-header">
                            <h3>Notificações</h3>

                            <button
                                onClick={() => setAberto(false)}
                                aria-label="Fechar notificações"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="notificacoes-vazias">
                            <CalendarDays size={32} />

                            <p>Nenhuma notificação no momento.</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default NotificationBell;
