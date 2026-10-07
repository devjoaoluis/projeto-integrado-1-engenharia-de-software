import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import Button from "./Button";
import Paginacao from "./components/Paginacao";

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
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function corAvatar(nome) {
  const soma = [...nome].reduce((total, letra) => total + letra.charCodeAt(0), 0);
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

function Campo({ id, label, children }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
      <label
        htmlFor={id}
        style={{
          position: "absolute",
          top: "-8px",
          left: "10px",
          padding: "0 4px",
          backgroundColor: "#ffffff",
          fontSize: "11px",
          color: "#667085",
          zIndex: 1,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Avatar({ nome }) {
  return (
    <span
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundColor: corAvatar(nome),
        color: "#ffffff",
        fontSize: "11px",
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
  const estilo = ESTILO_STATUS[status];
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

function Locatarios() {
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

  function remover(id) {
    setLocatarios((atual) => atual.filter((l) => l.id !== id));
  }

  return (
    <>
      {/* Topo: igual ao de Imóveis */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#1976d2" }}>Locatários</h2>

        <div style={{ width: "200px" }}>
          <Button
            texto="Novo locatário"
            type="button"
            onClick={() => setMostrarForm((aberto) => !aberto)}
          />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", padding: "8px 0", marginBottom: "24px" }}>
        <Campo id="filtro-busca" label="Procurar">
          <input
            id="filtro-busca"
            type="text"
            value={rascunho.busca}
            onChange={(e) => setRascunho({ ...rascunho, busca: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Nome, CPF, e-mail ou imóvel"
            style={estiloCampo}
          />
        </Campo>

        <Campo id="filtro-status" label="Status">
          <select
            id="filtro-status"
            value={rascunho.status}
            onChange={(e) => setRascunho({ ...rascunho, status: e.target.value })}
            style={estiloCampo}
          >
            <option value="">Todos</option>
            <option value="Em dia">Em dia</option>
            <option value="Pendente">Pendente</option>
            <option value="Inadimplente">Inadimplente</option>
          </select>
        </Campo>

        <button
          onClick={buscar}
          style={{
            height: "36px",
            padding: "0 18px",
            backgroundColor: "#1976d2",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.5px",
            cursor: "pointer",
          }}
        >
          BUSCAR
        </button>
        <button
          onClick={limpar}
          style={{
            height: "36px",
            padding: "0 18px",
            backgroundColor: "#ffffff",
            color: "#101828",
            border: "1px solid #101828",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.5px",
            cursor: "pointer",
          }}
        >
          LIMPAR
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <form
          onSubmit={salvar}
          style={{
            backgroundColor: "#f5f6f8",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>Cadastrar locatário</h3>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              aria-label="Fechar formulário"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px 16px" }}>
            <Campo id="f-nome" label="Nome completo *">
              <input id="f-nome" style={estiloCampo} value={form.nome} onChange={(e) => atualizarForm("nome", e.target.value)} />
            </Campo>
            <Campo id="f-cpf" label="CPF *">
              <input id="f-cpf" style={estiloCampo} value={form.cpf} onChange={(e) => atualizarForm("cpf", e.target.value)} />
            </Campo>
            <Campo id="f-tel" label="Telefone">
              <input id="f-tel" style={estiloCampo} value={form.telefone} onChange={(e) => atualizarForm("telefone", e.target.value)} />
            </Campo>
            <Campo id="f-email" label="E-mail">
              <input id="f-email" type="email" style={estiloCampo} value={form.email} onChange={(e) => atualizarForm("email", e.target.value)} />
            </Campo>
            <Campo id="f-imovel" label="Imóvel alugado">
              <input id="f-imovel" style={estiloCampo} value={form.imovel} onChange={(e) => atualizarForm("imovel", e.target.value)} />
            </Campo>
            <Campo id="f-status" label="Status">
              <select id="f-status" style={estiloCampo} value={form.status} onChange={(e) => atualizarForm("status", e.target.value)}>
                <option>Em dia</option>
                <option>Pendente</option>
                <option>Inadimplente</option>
              </select>
            </Campo>
          </div>

          <button
            type="submit"
            style={{
              marginTop: "20px",
              height: "36px",
              padding: "0 22px",
              backgroundColor: "#1976d2",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Salvar locatário
          </button>
        </form>
      )}

      {/* Lista */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: "720px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUNAS,
              gap: "12px",
              padding: "0 16px 10px",
              fontSize: "12px",
              color: AZUL,
            }}
          >
            <span>Locatário</span>
            <span>Imóvel</span>
            <span>Telefone</span>
            <span>Status</span>
            <span />
          </div>

          {visiveis.length === 0 ? (
            <p style={{ color: "#667085", padding: "24px 16px" }}>
              Nenhum locatário encontrado. Ajuste a busca ou clique em "Novo locatário" para cadastrar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {visiveis.map((l, i) => (
                <div
                  key={l.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLUNAS,
                    gap: "12px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: i % 2 === 0 ? "#f5f6f8" : "#ffffff",
                    fontSize: "14px",
                    color: "#101828",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Avatar nome={l.nome} />
                    {l.nome}
                  </span>
                  <span>{l.imovel || "—"}</span>
                  <span>{l.telefone || "—"}</span>
                  <span>
                    <Pilula status={l.status} />
                  </span>
                  <button
                    onClick={() => remover(l.id)}
                    aria-label={`Remover ${l.nome}`}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#98a2b3" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Paginacao paginaAtual={paginaAtual} totalPaginas={totalPaginas} onMudar={setPagina} />
    </>
  );
}

export default Locatarios;