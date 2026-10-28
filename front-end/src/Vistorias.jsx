import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2, FileText } from "lucide-react";

const AZUL = "#1877f2";
const POR_PAGINA = 6;
const COLUNAS = "1.8fr 1.5fr 1.2fr 1fr 1fr 40px";

const vistoriasIniciais = [
  {
    id: 1,
    imovelId: 1,
    imovel: "Apto 101 - Centro",
    contrato: "CTR-2024-001",
    tipo: "Entrada",
    data: "2024-01-15",
    status: "Concluída",
    midias: [
      { id: 101, nome: "sala_entrada.jpg", tipo: "image" },
      { id: 102, nome: "cozinha_video.mp4", tipo: "video" }
    ],
    observacoes: "Imóvel entregue em perfeito estado de pintura."
  },
  {
    id: 2,
    imovelId: 2,
    imovel: "Casa 12 - Jardim",
    contrato: "CTR-2024-002",
    tipo: "Saída",
    data: "2024-02-10",
    status: "Pendente",
    midias: [],
    observacoes: "Aguardando anexo de fotos da vistoria final de saída."
  }
];

const formVazio = {
  imovelId: 1,
  imovel: "",
  contrato: "",
  tipo: "Entrada",
  data: new Date().toISOString().split("T")[0],
  status: "Pendente",
  observacoes: "",
  midias: []
};

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

export default function Vistorias() {
  const navigate = useNavigate();
  const [vistorias, setVistorias] = useState(vistoriasIniciais);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [pagina, setPagina] = useState(1);

  // Filtragem
  const filtradas = vistorias.filter((v) => {
    const texto = `${v.imovel} ${v.contrato} ${v.observacoes}`.toLowerCase();
    const bateTexto = texto.includes(busca.toLowerCase());
    const bateTipo = filtroTipo === "Todos" || v.tipo === filtroTipo;
    return bateTexto && bateTipo;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function handleUploadFicheiros(e) {
    const files = Array.from(e.target.files);
    const novosFicheiros = files.map((f, index) => ({
      id: Date.now() + index,
      nome: f.name,
      tipo: f.type.startsWith("video") ? "video" : "image"
    }));

    setForm((atual) => ({
      ...atual,
      midias: [...atual.midias, ...novosFicheiros]
    }));
  }

  function handleRemoverMidia(midiaId) {
    setForm((atual) => ({
      ...atual,
      midias: atual.midias.filter((m) => m.id !== midiaId)
    }));
  }

  function handleSalvar(e) {
    e.preventDefault();

    // Validação: Exigir pelo menos 1 mídia
    if (form.midias.length === 0) {
      alert("Atenção: É obrigatório anexar pelo menos 1 foto ou vídeo da vistoria.");
      return;
    }

    const novaVistoria = {
      id: Date.now(),
      ...form,
      status: "Concluída"
    };

    setVistorias([novaVistoria, ...vistorias]);
    setForm(formVazio);
    setMostrarModal(false);
  }

  function handleRemoverVistoria(id, e) {
    e.stopPropagation(); // Impede a navegação para os detalhes da vistoria
    if (confirm("Tens a certeza que pretendes eliminar esta vistoria?")) {
      setVistorias((atual) => atual.filter((v) => v.id !== id));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1d2939", margin: 0 }}>
            Vistorias do Imóvel
          </h1>
          <p style={{ color: "#667085", fontSize: "14px", margin: "4px 0 0 0" }}>
            Registo e documentação de entrada e saída de imóveis
          </p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          style={{
            backgroundColor: AZUL,
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Nova Vistoria
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar por imóvel, contrato..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ ...estiloCampo, flex: 1 }}
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ ...estiloCampo, width: "200px" }}
        >
          <option value="Todos">Todos os tipos</option>
          <option value="Entrada">Vistoria de Entrada</option>
          <option value="Saída">Vistoria de Saída</option>
        </select>
      </div>

      {/* Tabela de Vistorias */}
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
            <span>Imóvel / Contrato</span>
            <span>Tipo de Vistoria</span>
            <span>Data</span>
            <span>Mídias</span>
            <span>Status</span>
            <span />
          </div>

          {visiveis.length === 0 ? (
            <p style={{ color: "#667085", padding: "24px 16px", textAlign: "center" }}>
              Nenhuma vistoria encontrada.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {visiveis.map((v) => (
                <div
                  key={v.id}
                  onClick={() => navigate(`/vistorias/${v.id}`)}
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
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                >
         
                 <div>
                    <strong style={{ display: "block", color: "#101828" }}>
                      {v.imovel}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#667085" }}>{v.contrato}</span>
                  </div>
                  
                  <div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor: v.tipo === "Entrada" ? "#dbeafe" : "#fef3c7",
                        color: v.tipo === "Entrada" ? "#1e40af" : "#b45309"
                      }}
                    >
                      {v.tipo}
                    </span>
                  </div>

                  <span style={{ color: "#4b5563" }}>{v.data}</span>

                  <span style={{ color: "#4b5563", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <FileText size={16} /> {v.midias.length} ficheiro(s)
                  </span>

                  <div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: v.status === "Concluída" ? "#e7f6ee" : "#fff6dc",
                        color: v.status === "Concluída" ? "#1a8f4c" : "#c99a06"
                      }}
                    >
                      {v.status}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleRemoverVistoria(v.id, e)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Registo de Vistoria */}
      {mostrarModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              width: "480px",
              maxWidth: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#111827" }}>Registar Vistoria</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvar} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#667085", marginBottom: "4px" }}>Momento da Vistoria *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  style={estiloCampo}
                  required
                >
                  <option value="Entrada">Vistoria de Entrada</option>
                  <option value="Saída">Vistoria de Saída</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#667085", marginBottom: "4px" }}>Imóvel *</label>
                <input
                  type="text"
                  placeholder="Ex: Apto 101 - Centro"
                  value={form.imovel}
                  onChange={(e) => setForm({ ...form, imovel: e.target.value })}
                  style={estiloCampo}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#667085", marginBottom: "4px" }}>Contrato Vinculado *</label>
                <input
                  type="text"
                  placeholder="Ex: CTR-2024-001"
                  value={form.contrato}
                  onChange={(e) => setForm({ ...form, contrato: e.target.value })}
                  style={estiloCampo}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#667085", marginBottom: "4px" }}>Data da Vistoria *</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  style={estiloCampo}
                  required
                />
              </div>

              {/* Upload de Fotos e Vídeos */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
                  Anexar Fotos e Vídeos *
                </label>
                <div
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "6px",
                    padding: "16px",
                    textAlign: "center",
                    backgroundColor: "#f8fafc",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleUploadFicheiros}
                    style={{ display: "none" }}
                    id="input-midia"
                  />
                  <label htmlFor="input-midia" style={{ cursor: "pointer", color: AZUL, fontWeight: "600", fontSize: "13px" }}>
                    + Selecionar ficheiros (Fotos / Vídeos)
                  </label>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Registo fotográfico e em vídeo do estado do imóvel
                  </p>
                </div>

                {form.midias.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px", maxHeight: "100px", overflowY: "auto" }}>
                    {form.midias.map((m) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", padding: "6px 10px", borderRadius: "4px", fontSize: "12px" }}>
                        <span style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "350px" }}>
                          📎 {m.nome}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoverMidia(m.id)}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#667085", marginBottom: "4px" }}>Observações / Estado do Imóvel</label>
                <textarea
                  placeholder="Descreve detalhadamente o estado das paredes, pisos, instalações..."
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  style={{ ...estiloCampo, height: "80px", padding: "8px 12px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  style={{ backgroundColor: "#e2e8f0", color: "#334155", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: AZUL, color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                >
                  Registar Vistoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}