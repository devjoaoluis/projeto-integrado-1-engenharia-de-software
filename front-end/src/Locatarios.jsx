import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2 } from "lucide-react";

const AZUL = "#1877f2";
const POR_PAGINA = 6;
const COLUNAS = "2.4fr 1.8fr 1.4fr 1.2fr 40px";

const ESTILO_STATUS = {
  "Em dia": { fundo: "#e7f6ee", cor: "#1a8f4c" },
  Pendente: { fundo: "#fff6dc", cor: "#c99a06" },
  Inadimplente: { fundo: "#fdeaea", cor: "#e5484d" },
};

const CORES_AVATAR = ["#1877f2", "#7c5cfc", "#0ea5a4", "#e5844d", "#d6457a", "#5b6b82"];

const locatariosIniciais = [
  { id: 1, nome: "Marcos Oliveira da Silva", cpf: "111.222.333-44", telefone: "(88) 99911-0001", email: "marcos@email.com", imovel: "Apto 101 - Centro", status: "Inadimplente" },
  { id: 2, nome: "Natalia das Graças Monteiro", cpf: "222.333.444-55", telefone: "(88) 99911-0002", email: "natalia@email.com", imovel: "Casa 12 - Jardim", status: "Em dia" },
  { id: 3, nome: "Carlos Manoel Lima", cpf: "333.444.555-66", telefone: "(88) 99911-0003", email: "carlos@email.com", imovel: "Apto 203 - Centro", status: "Pendente" },
  { id: 4, nome: "Orlando Diego Nobre", cpf: "444.555.666-77", telefone: "(88) 99911-0004", email: "orlando@email.com", imovel: "Kitnet 05 - Campus", status: "Em dia" },
  { id: 5, nome: "Amanda Thialita Gomes", cpf: "555.666.777-88", telefone: "(88) 99911-0005", email: "amanda@email.com", imovel: "Casa 7 - Planalto", status: "Inadimplente" },
  { id: 6, nome: "César Gomes Amaral", cpf: "666.777.888-99", telefone: "(88) 99911-0006", email: "cesar@email.com", imovel: "Apto 305 - Centro", status: "Em dia" },
  { id: 7, nome: "Ester Julia Ferreira dos Santos", cpf: "777.888.999-00", telefone: "(88) 99911-0007", email: "ester@email.com", imovel: "Kitnet 02 - Campus", status: "Pendente" },
  { id: 8, nome: "Eduardo Breno Lima Souza", cpf: "888.999.000-11", telefone: "(88) 99911-0008", email: "eduardo@email.com", imovel: "Casa 21 - Jardim", status: "Em dia" },
];

const formVazio = { nome: "", cpf: "", telefone: "", email: "", imovel: "", status: "Em dia" };

function iniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function corAvatar(nome) {
  const soma = [...(nome || "")].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

const estiloCampo = {
  width: "100%",
  height: "44px",
  padding: "0 12px",
  border: "1px solid #c9ced6",
  borderRadius: "4px",
  fontSize: "14px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
};

function Avatar({ nome }) {
  return (
    <span
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        backgroundColor: corAvatar(nome),
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "bold",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

function Pilula({ status }) {
  const estilo = ESTILO_STATUS[status] || { fundo: "#f3f4f6", cor: "#374151" };
  return (
    <span
      style={{
        backgroundColor: estilo.fundo,
        color: estilo.cor,
        padding: "4px 14px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "500",
      }}
    >
      {status}
    </span>
  );
}

function Paginacao({ paginaAtual, totalPaginas, onMudar }) {
  if (totalPaginas <= 1) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "20px" }}>
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => {
        const ativo = num === paginaAtual;
        return (
          <button
            key={num}
            onClick={() => onMudar(num)}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: ativo ? AZUL : "#e5e7eb",
              color: ativo ? "#ffffff" : "#374151",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

export default function Locatarios() {
  const navigate = useNavigate();
  const [locatarios, setLocatarios] = useState(locatariosIniciais);
  const [rascunho, setRascunho] = useState({ busca: "", status: "" });
  const [filtros, setFiltros] = useState({ busca: "", status: "" });
  const [pagina, setPagina] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formVazio);

  const filtrados = locatarios.filter((l) => {
    const texto = `${l.nome} ${l.cpf} ${l.email} ${l.imovel}`.toLowerCase();
    const bateBusca = texto.includes(filtros.busca.toLowerCase());
    const bateStatus = !filtros.status || l.status === filtros.status;
    return bateBusca && bateStatus;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function buscar() {
    setFiltros(rascunho);
    setPagina(1);
  }

  function limpar() {
    const vazio = { busca: "", status: "" };
    setRascunho(vazio);
    setFiltros(vazio);
    setPagina(1);
  }

  function atualizarForm(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.cpf.trim()) return;
    setLocatarios((atual) => [{ ...form, id: Date.now() }, ...atual]);
    setForm(formVazio);
    setMostrarForm(false);
    setPagina(1);
  }

  function remover(id, e) {
    e.stopPropagation();
    setLocatarios((atual) => atual.filter((l) => l.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1d2939", margin: 0 }}>Locatários</h1>
        <button
          onClick={() => setMostrarForm(true)}
          style={{ backgroundColor: AZUL, color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
        >
          Novo locatário
        </button>
      </div>

      {/* Filtros de Busca */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", width: "100%" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <label style={{ position: "absolute", top: "-8px", left: "10px", background: "#f5f6f8", padding: "0 4px", fontSize: "11px", color: "#667085", zIndex: 1 }}>
            Procurar
          </label>
          <input
            type="text"
            placeholder="Nome, CPF, e-mail ou imóvel"
            value={rascunho.busca}
            onChange={(e) => setRascunho({ ...rascunho, busca: e.target.value })}
            style={estiloCampo}
          />
        </div>

        <div style={{ width: "220px", position: "relative" }}>
          <label style={{ position: "absolute", top: "-8px", left: "10px", background: "#f5f6f8", padding: "0 4px", fontSize: "11px", color: "#667085", zIndex: 1 }}>
            Status
          </label>
          <select
            value={rascunho.status}
            onChange={(e) => setRascunho({ ...rascunho, status: e.target.value })}
            style={estiloCampo}
          >
            <option value="">Todos</option>
            <option value="Em dia">Em dia</option>
            <option value="Pendente">Pendente</option>
            <option value="Inadimplente">Inadimplente</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={buscar}
            style={{ backgroundColor: AZUL, color: "#fff", border: "none", padding: "0 16px", height: "44px", borderRadius: "4px", fontWeight: "600", cursor: "pointer" }}
          >
            BUSCAR
          </button>
          <button
            onClick={limpar}
            style={{ backgroundColor: "#e5e7eb", color: "#374151", border: "none", padding: "0 16px", height: "44px", borderRadius: "4px", fontWeight: "600", cursor: "pointer" }}
          >
            LIMPAR
          </button>
        </div>
      </div>

      {/* Modal / Formulário de Cadastro */}
      {mostrarForm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", padding: "24px", borderRadius: "8px", width: "400px", maxWidth: "90%", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#111827" }}>Cadastrar Novo Locatário</h3>
              <button onClick={() => setMostrarForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={20} /></button>
            </div>
            <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" placeholder="Nome completo" value={form.nome} onChange={(e) => atualizarForm("nome", e.target.value)} style={estiloCampo} required />
              <input type="text" placeholder="CPF" value={form.cpf} onChange={(e) => atualizarForm("cpf", e.target.value)} style={estiloCampo} required />
              <input type="text" placeholder="Telefone" value={form.telefone} onChange={(e) => atualizarForm("telefone", e.target.value)} style={estiloCampo} />
              <input type="email" placeholder="E-mail" value={form.email} onChange={(e) => atualizarForm("email", e.target.value)} style={estiloCampo} />
              <input type="text" placeholder="Imóvel vinculado" value={form.imovel} onChange={(e) => atualizarForm("imovel", e.target.value)} style={estiloCampo} />
              <select value={form.status} onChange={(e) => atualizarForm("status", e.target.value)} style={estiloCampo}>
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
                <option value="Inadimplente">Inadimplente</option>
              </select>
              <button type="submit" style={{ backgroundColor: AZUL, color: "#fff", border: "none", height: "44px", borderRadius: "4px", fontWeight: "600", cursor: "pointer" }}>Salvar Locatário</button>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de Listagem */}
      <div style={{ background: "#ffffff", borderRadius: "8px", padding: "16px", border: "1px solid #e5e7eb" }}>
        <div style={{ minWidth: "720px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUNAS,
              gap: "12px",
              padding: "0 16px 12px",
              fontSize: "13px",
              color: AZUL,
              fontWeight: "600",
              borderBottom: "1px solid #f3f4f6"
            }}
          >
            <span>Locatário</span>
            <span>Imóvel</span>
            <span>Telefone</span>
            <span>Status</span>
            <span />
          </div>

          {visiveis.length === 0 ? (
            <p style={{ color: "#667085", padding: "24px 16px", textAlign: "center" }}>
              Nenhum locatário encontrado.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {visiveis.map((l) => (
                <div
                  key={l.id}
                  onClick={() => navigate(`/locatarios/${l.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLUNAS,
                    gap: "12px",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                    fontSize: "14px",
                    color: "#101828",
                    cursor: "pointer",
                    border: "1px solid transparent",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "500", color: AZUL }}>
                    <Avatar nome={l.nome} />
                    {l.nome}
                  </span>
                  <span style={{ color: "#4b5563" }}>{l.imovel || "—"}</span>
                  <span style={{ color: "#4b5563" }}>{l.telefone || "—"}</span>
                  <span>
                    <Pilula status={l.status} />
                  </span>
                  <button
                    onClick={(e) => remover(l.id, e)}
                    aria-label={`Remover ${l.nome}`}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", justifyContent: "center" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paginação */}
      <Paginacao paginaAtual={paginaAtual} totalPaginas={totalPaginas} onMudar={setPagina} />
    </div>
  );
}
