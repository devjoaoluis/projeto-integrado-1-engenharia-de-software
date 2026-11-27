import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  Users,
  UserCheck,
  FileText,
  ArrowLeftRight,
  CalendarDays,
  ClipboardCheck,
  LogOut,
} from "lucide-react";
import { sair } from "../auth/session";

const menuItens = [
  { nome: "Home", icone: Home, to: "/home" },
  { nome: "Imóveis", icone: Building2, to: "/imoveis" },
  { nome: "Contatos", icone: Users, to: "/contatos" },
  { nome: "Locatários", icone: UserCheck, to: "/locatarios" },
  { nome: "Contratos", icone: FileText, to: "/contratos" },
  { nome: "Pagamentos", icone: ArrowLeftRight, to: "/pagamentos" },
  { nome: "Visitas", icone: CalendarDays, to: "/visitas" },
  { nome: "Vistorias", icone: ClipboardCheck, to: "/vistorias" },
];

export function Sidebar() {
  const navigate = useNavigate();

  async function handleSair() {
    if (window.api) await window.api.auth.logout();
    sair();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div>
        <h2 className="sidebar-brand">Locus</h2>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {menuItens.map((item) => {
            const Icone = item.icone;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}
              >
                <Icone size={20} aria-hidden="true" />
                {item.nome}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        className="sidebar-logout"
        onClick={handleSair}
      >
        <LogOut size={20} aria-hidden="true" />
        Sair
      </button>
    </aside>
  );
}