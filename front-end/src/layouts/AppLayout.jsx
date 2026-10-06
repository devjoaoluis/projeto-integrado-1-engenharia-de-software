import { Outlet, useLocation } from "react-router-dom";
import { User, Bell } from "lucide-react";
import { Sidebar } from "../components/Sidebar";

const titulos = {
    "/home": "Home",
    "/imoveis": "Imóveis",
    "/contratos": "Contratos",
    "/pagamentos": "Pagamentos",
    "/visitas": "Visitas",
    "/vistorias": "Vistorias",
};

function AppLayout() {
    const { pathname } = useLocation();

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
                    }

                    .topo h1 {
                        font-size: 24px;
                        font-weight: bold;
                    }

                    .topo-icones {
                        display: flex;
                        gap: 16px;
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
                        <h1>{titulos[pathname]}</h1>
                        <div className="topo-icones">
                            <User size={20} />
                            <Bell size={20} />
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