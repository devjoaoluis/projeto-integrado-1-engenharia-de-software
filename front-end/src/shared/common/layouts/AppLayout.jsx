
import { Outlet, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

const titulos = {
    "/home": "Home",
    "/imoveis": "Imóveis",
    "/contratos": "Contratos",
    "/pagamentos": "Pagamentos",
    "/visitas": "Visitas",
    "/vistorias": "Vistorias",
    "/locatarios": "Locatários",
    "/contatos": "Contatos",
};

function AppLayout() {
    const { pathname } = useLocation();

    const titulo =
        titulos[pathname] ??
        (pathname === "/imoveis/cadastrar"
            ? "Cadastrar imóvel"
            : pathname.startsWith("/imoveis/")
                ? "Visão geral do imóvel"
                : "Locus");

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
                        min-width: 0;
                    }

                    .topo {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background-color: #1877f2;
                        color: white;
                        padding: 16px 24px;
                    }

                    .topo h1 {
                        font-size: 24px;
                        font-weight: bold;
                    }

                    .topo-icones {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .topo-icones > svg {
                        cursor: pointer;
                    }

                    .conteudo {
                        flex: 1;
                        background-color: #ffffff;
                        padding: 24px;
                    }
                `}
            </style>

            <div className="layout">
                <Sidebar />

                <div className="principal">
                    <header className="topo">
                        <h1>{titulo}</h1>

                        <div className="topo-icones">
                            <User size={20} />
                            <NotificationBell />
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
