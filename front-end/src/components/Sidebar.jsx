import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
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
    <aside
      style={{
        width: "220px",
        backgroundColor: "#1877f2",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px 12px 12px",
        minHeight: "100vh",
      }}
    >
      <div>
        <h2 style={{ marginBottom: "30px", fontSize: "22px", fontWeight: "bold" }}>Locus</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {menuItens.map((item) => {
            const Icone = item.icone;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: isActive ? "#52a3f7" : "transparent",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? "bold" : "normal",
                })}
              >
                <Icone size={18} />
                {item.nome}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <button
        onClick={handleSair}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#ffffff",
          color: "#1877f2",
          border: "none",
          borderRadius: "6px",
          padding: "10px 16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        <LogOut size={18} color="#FF0000" />
        Sair
      </button>
    </aside>
  );
}