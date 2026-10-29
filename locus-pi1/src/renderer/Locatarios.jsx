import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import BotaoVoltar from "./components/BotaoVoltar";

const POR_PAGINA = 5;
const AZUL = "#2563eb";
const COLUNAS = "2fr 1.5fr 1fr 1fr 90px 220px";

const formVazio = {
  nome: "",
  cpfCnpj: "",
  telefone: "",
  email: "",
  status: "Em dia"
};

// Componente auxiliar para o Avatar com iniciais
function Avatar({ nome }) {
  const iniciais = nome
    ? nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "L";

  return (
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        backgroundColor: "#dbeafe",
        color: "#1e40af",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "13px",
        flexShrink: 0
      }}
    >
      {iniciais}
    </div>
  );
}

// Componente auxiliar para a pílula de status
function Pilula({ status }) {
  const isEmDia = status === "Em dia";
  const isAtrasado = status === "Atrasado";

  const bg = isEmDia ? "#dcfce7" : isAtrasado ? "#fee2e2" : "#fef3c7";
  const color = isEmDia ? "#15803d" : isAtrasado ? "#b91c1c" : "#b45309";

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: bg,
        color: color,
        display: "inline-block"
      }}
    >
      {status || "Em dia"}
    </span>
  );
}

// Componente de Paginação simples
function Paginacao({ paginaAtual, totalPaginas, onMudar }) {
  if (totalPaginas <= 1) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "20px" }}>
      <button
        onClick={() => onMudar(Math.max(1, paginaAtual - 1))}
        disabled={paginaAtual === 1}
        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: paginaAtual === 1 ? "not-allowed" : "pointer" }}
      >
        Anterior
      </button>
      <span style={{ fontSize: "14px", color: "#475569" }}>
        Página <strong>{paginaAtual}</strong> de {totalPaginas}
      </span>
      <button
        onClick={() => onMudar(Math.min(totalPaginas, paginaAtual + 1))}
        disabled={paginaAtual === totalPaginas}
        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: paginaAtual === totalPaginas ? "not-allowed" : "pointer" }}
      >
        Seguinte
      </button>
    </div>
  );
}

export default function Locatarios() {
  const navigate = useNavigate();
  const [locatarios, setLocatarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rascunho, setRascunho] = useState({ busca: "", status: "" });
  const [filtros, setFiltros] = useState({ busca: "", status: "" });
  const [pagina, setPagina] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);

  // Carregar locatários da base de dados ao abrir o componente
  useEffect(() => {
    async function carregar() {
      try {
        const [dados, alugueis, imoveis] = await Promise.all([
          window.api.clients.list(),
          window.api.rentals ? window.api.rentals.list().catch(() => []) : [],
          window.api.properties ? window.api.properties.list().catch(() => []) : [],
        ]);

        const imovelPorId = {};
        (imoveis || []).forEach((im) => {
          imovelPorId[im.id] = im.title || im.address || `Imóvel #${im.id.slice(0, 5)}`;
        });

        const imovelPorCliente = {};
        (alugueis || []).forEach((aluguel) => {
          if (aluguel.tenantId && aluguel.propertyId && (!aluguel.status || aluguel.status === "ACTIVE")) {
            imovelPorCliente[aluguel.tenantId] = imovelPorId[aluguel.propertyId] || "Imóvel associado";
          }
        });

        const formatados = (dados || []).map((l) => ({
          ...l,
          nome: l.name || l.nome,
          telefone: l.phone || l.telefone,
          cpf: l.cpfCnpj || l.cpf,
          imovel: imovelPorCliente[l.id] || l.imovel || l.property || "—",
          status: l.status || "Em dia"
        }));
        setLocatarios(formatados);
      } catch (err) {
        console.error("Erro ao carregar locatários:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const filtrados = locatarios.filter((l) => {
    const nome = l.nome || "";
    const cpf = l.cpf || "";
    const email = l.email || "";
    const imovel = l.imovel || "";

    const texto = `${nome} ${cpf} ${email} ${imovel}`.toLowerCase();
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

  async function salvar(e) {
    e.preventDefault();

    const documentoValor = form.cpfCnpj || form.cpf || "";
    const telefoneValor = form.telefone || form.phone || "";

    if (!form.nome || !form.nome.trim() || !documentoValor.trim()) {
      alert("Por favor, preencha o Nome e o CPF/CNPJ.");
      return;
    }

    try {
      const dadosParaEnviar = {
        name: form.nome,
        cpfCnpj: documentoValor,
        phone: telefoneValor,
        email: form.email || null,
        type: "TENANT",
        status: form.status || "Em dia"
      };

      const respostaServidor = editando
        ? await window.api.clients.update({ id: editando, ...dadosParaEnviar })
        : await window.api.clients.create(dadosParaEnviar);

      const novoLocatario = {
        ...respostaServidor,
        nome: respostaServidor.name || respostaServidor.nome,
        telefone: respostaServidor.phone || respostaServidor.telefone,
        cpf: respostaServidor.cpfCnpj || respostaServidor.cpf,
        imovel: respostaServidor.imovel || respostaServidor.property || "—",
        status: respostaServidor.status || form.status || "Em dia"
      };

      setLocatarios((atual) => editando
        ? atual.map((locatario) => locatario.id === editando ? novoLocatario : locatario)
        : [novoLocatario, ...atual]);
      setForm(formVazio);
      setEditando(null);
      setMostrarForm(false);
      setPagina(1);
    } catch (err) {
      console.error("Erro ao salvar locatário:", err);
      alert("Erro ao salvar o locatário na base de dados.");
    }

    function editar(locatario) {
      setEditando(locatario.id);
      setForm({
        nome: locatario.nome || locatario.name || "",
        cpfCnpj: locatario.cpf || locatario.cpfCnpj || "",
        telefone: locatario.telefone || locatario.phone || "",
        email: locatario.email || "",
        status: locatario.status || "Em dia",
      });
      setMostrarForm(true);
    }

    function cancelarEdicao() {
      setEditando(null);
      setForm(formVazio);
      setMostrarForm(false);
    }
  }

  async function excluir(id) {
    if (confirm("Tens a certeza que pretendes excluir este locatário?")) {
      try {
        await window.api.clients.delete(id);
        setLocatarios((atual) => atual.filter((l) => l.id !== id));
      } catch (err) {
        console.error("Erro ao excluir locatário:", err);
        alert("Erro ao excluir o locatário da base de dados.");
      }
    }
  }

  if (loading) {
    return <p style={{ padding: "24px", color: "#667085" }}>A carregar locatários...</p>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <BotaoVoltar destino="/home" texto="Voltar" />
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1d2939" }}>Locatários</h1>
        <button
          className="ui-button"
          onClick={() => {
            if (mostrarForm) cancelarEdicao();
            else setMostrarForm(true);
          }}
          style={{
            width: "200px"
          }}
        >
          {mostrarForm ? "Cancelar" : "Novo locatário"}
        </button>
      </div>

      {/* Formulário de Cadastro */}
      {mostrarForm && (
        <form onSubmit={salvar} style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#334155" }}>
            {editando ? "Editar locatário" : "Cadastrar novo locatário"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label className="ui-label ui-label-required">Nome completo</label>
              <input
                className="ui-control"
                type="text"
                value={form.nome}
                onChange={(e) => atualizarForm("nome", e.target.value)}
                required
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-required">CPF/CNPJ</label>
              <input
                className="ui-control"
                type="text"
                value={form.cpfCnpj}
                onChange={(e) => atualizarForm("cpfCnpj", e.target.value)}
                required
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">Telefone</label>
              <input
                className="ui-control"
                type="text"
                value={form.telefone}
                onChange={(e) => atualizarForm("telefone", e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">E-mail</label>
              <input
                className="ui-control"
                type="email"
                value={form.email}
                onChange={(e) => atualizarForm("email", e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label className="ui-label ui-label-optional">Status</label>
              <select
                className="ui-control"
                value={form.status}
                onChange={(e) => atualizarForm("status", e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff" }}
              >
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
                <option value="Atrasado">Atrasado</option>
              </select>
            </div>
          </div>
          <button
            className="ui-button"
            type="submit"
          >
            {editando ? "Salvar" : "Cadastrar"}
          </button>
        </form>
      )}

      {/* Barra de Pesquisa e Filtros */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Procurar por nome, CPF, e-mail ou imóvel..."
          value={rascunho.busca}
          onChange={(e) => setRascunho({ ...rascunho, busca: e.target.value })}
          style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
        />
        <select
          value={rascunho.status}
          onChange={(e) => setRascunho({ ...rascunho, status: e.target.value })}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}
        >
          <option value="">Todos os status</option>
          <option value="Em dia">Em dia</option>
          <option value="Pendente">Pendente</option>
          <option value="Atrasado">Atrasado</option>
        </select>
        <button onClick={buscar} style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Buscar</button>
        <button onClick={limpar} style={{ padding: "10px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", cursor: "pointer" }}>Limpar</button>
      </div>

      {/* Lista de Locatários */}
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "16px" }}>
        <div style={{ minWidth: "720px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUNAS,
              gap: "12px",
              padding: "0 16px 10px",
              fontSize: "12px",
              fontWeight: "600",
              color: AZUL,
              borderBottom: "1px solid #e2e8f0"
            }}
          >
            <span>Locatário</span>
            <span>Imóvel</span>
            <span>Telefone</span>
            <span>Status</span>
            <span>Dossiê</span>
            <span>Ações</span>
          </div>

          {visiveis.length === 0 ? (
            <p style={{ color: "#667085", padding: "24px 16px", textAlign: "center" }}>
              Nenhum locatário encontrado. Ajuste a busca ou clique em "Novo locatário" para cadastrar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
              {visiveis.map((l, i) => (
                <div
                  key={l.id}
                  onClick={() => navigate(`/locatarios/${l.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLUNAS,
                    gap: "12px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                    fontSize: "14px",
                    color: "#101828",
                    cursor: "pointer",
                    border: "1px solid transparent",
                    transition: "border-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "500", color: "#2563eb" }}>
                    <Avatar nome={l.nome} />
                    {l.nome}
                  </span>
                  <span style={{ color: "#475569" }}>{l.imovel || "—"}</span>
                  <span style={{ color: "#475569" }}>{l.telefone || "—"}</span>
                  <span>
                    <Pilula status={l.status} />
                  </span>
                  <span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/locatarios/${l.id}`);
                      }}
                      style={{
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Dossiê
                    </button>
                  </span>
                  <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="ui-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        editar(l);
                      }}
                      style={{ minHeight: "32px", padding: "0 12px", fontSize: "12px" }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        excluir(l.id);
                      }}
                      aria-label={`Excluir ${l.nome}`}
                      style={{
                        minHeight: "32px",
                        padding: "0 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "#e5e7eb",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "#b42318",
                        fontWeight: "600",
                        fontSize: "12px",
                      }}
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Paginacao paginaAtual={paginaAtual} totalPaginas={totalPaginas} onMudar={setPagina} />
    </div>
  );
}