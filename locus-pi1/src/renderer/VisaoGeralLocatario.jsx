import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  File,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Building2,
  Calendar,
  FolderCheck,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

const CATEGORIAS = [
  { valor: "identificacao", rotulo: "Identificação (RG / CNH / CPF)", cor: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  { valor: "comprovante_renda", rotulo: "Comprovante de Renda", cor: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  { valor: "antecedentes", rotulo: "Antecedentes Criminais", cor: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { valor: "contrato", rotulo: "Contrato", cor: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { valor: "outros", rotulo: "Outros Documentos", cor: "#4b5563", bg: "#f3f4f6", border: "#e5e7eb" },
];

function obterInfoCategoria(catValor) {
  return (
    CATEGORIAS.find((c) => c.valor === catValor) || {
      valor: catValor || "outros",
      rotulo: "Outros",
      cor: "#4b5563",
      bg: "#f3f4f6",
      border: "#e5e7eb",
    }
  );
}

function formatarTamanho(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const tamanhos = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + tamanhos[i];
}

function formatarData(dataIso) {
  if (!dataIso) return "—";
  try {
    const d = new Date(Number(dataIso) || dataIso);
    if (Number.isNaN(d.getTime())) return String(dataIso);
    return (
      d.toLocaleDateString("pt-BR") +
      " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return String(dataIso);
  }
}

function formatarDataSomenteDia(valor) {
  if (!valor) return null;
  try {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
      const [ano, mes, dia] = valor.slice(0, 10).split("-");
      return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(Number(valor) || valor);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return null;
  }
}

export default function VisaoGeralLocatario() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [locatario, setLocatario] = useState(null);
  const [imovelAssociado, setImovelAssociado] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de upload
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [categoriaUpload, setCategoriaUpload] = useState("identificacao");
  const [enviando, setEnviando] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Filtros e busca
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [buscaNome, setBuscaNome] = useState("");

  // Feedback
  const [toast, setToast] = useState(null);
  const [erro, setErro] = useState("");

  // Modal de Preview
  const [previewDoc, setPreviewDoc] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    carregarDadosCompletos();
  }, [id]);

  async function carregarDadosCompletos() {
    try {
      setLoading(true);
      setErro("");

      // 1. Carregar locatário
      let clienteEncontrado = null;
      if (window.api?.clients?.get) {
        try {
          clienteEncontrado = await window.api.clients.get(id);
        } catch {
          // fallback para lista
        }
      }

      if (!clienteEncontrado && window.api?.clients?.list) {
        const lista = await window.api.clients.list();
        clienteEncontrado = (lista || []).find((c) => String(c.id) === String(id));
      }

      if (clienteEncontrado) {
        setLocatario({
          ...clienteEncontrado,
          nome: clienteEncontrado.name || clienteEncontrado.nome || "Locatário",
          telefone: clienteEncontrado.phone || clienteEncontrado.telefone || "—",
          email: clienteEncontrado.email || "—",
          cpf: clienteEncontrado.cpfCnpj || clienteEncontrado.cpf || "—",
          status: clienteEncontrado.status || "Em dia",
        });

        // 2. Buscar imóvel e contrato associado através dos rentals
        if (window.api?.rentals?.list && window.api?.properties?.get) {
          try {
            const rentals = await window.api.rentals.list();
            const rentalAtivo = (rentals || []).find(
              (r) => String(r.tenantId) === String(id) && (!r.status || r.status === "ACTIVE")
            );

            if (rentalAtivo?.propertyId) {
              const prop = await window.api.properties.get(rentalAtivo.propertyId);

              let dataTermino =
                rentalAtivo.endDate ??
                rentalAtivo.terminationDate ??
                rentalAtivo.dataFim ??
                rentalAtivo.contractEndDate ??
                null;

              // Fallback: tenta consultar resumo de término caso não venha direto no objeto
              if (!dataTermino && window.api?.rentals?.getTerminationSummary) {
                try {
                  const summary = await window.api.rentals.getTerminationSummary(rentalAtivo.id);
                  dataTermino =
                    summary?.endDate ?? summary?.terminationDate ?? summary?.dataFim ?? null;
                } catch {
                  // ignora se não houver término registado
                }
              }

              setImovelAssociado({
                id: prop.id,
                titulo: prop.title || prop.address,
                aluguel: rentalAtivo.monthlyRent,
                dataInicio: rentalAtivo.startDate,
                dataFim: dataTermino,
              });
            } else {
              setImovelAssociado(null);
            }
          } catch (rentalErr) {
            console.error("Erro ao carregar locação associada:", rentalErr);
          }
        }
      }

      // 3. Carregar documentos do dossiê
      await carregarDocumentos();
    } catch (err) {
      console.error("Erro ao carregar dados do locatário:", err);
      setErro("Falha ao carregar informações do locatário.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarDocumentos() {
    if (!window.api?.documentos?.listar) return;
    try {
      const docs = await window.api.documentos.listar({ locatarioId: id });
      setDocumentos(docs || []);
    } catch (err) {
      console.error("Erro ao listar documentos:", err);
      setErro("Não foi possível carregar a lista de documentos do dossiê.");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) validarEConfigurarArquivo(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validarEConfigurarArquivo(file);
  }

  function validarEConfigurarArquivo(file) {
    setErro("");
    const extensoesValidas = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!extensoesValidas.includes(ext)) {
      setErro("Formato não suportado. Apenas ficheiros PDF, JPG, JPEG e PNG são permitidos.");
      return;
    }
    setArquivoSelecionado(file);
  }

  async function handleUploadDocumento(e) {
    e.preventDefault();
    if (!arquivoSelecionado) {
      setErro("Selecione um ficheiro para enviar.");
      return;
    }
    if (!window.api?.documentos?.upload) {
      setErro("Serviço de upload indisponível.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      const filePath = window.api.getPathForFile
        ? window.api.getPathForFile(arquivoSelecionado)
        : arquivoSelecionado.path;

      await window.api.documentos.upload({
        locatarioId: id,
        categoria: categoriaUpload,
        nomeOriginal: arquivoSelecionado.name,
        caminhoOrigem: filePath,
        tamanhoBytes: arquivoSelecionado.size,
      });

      setArquivoSelecionado(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setToast("Documento anexado ao dossiê com sucesso!");
      await carregarDocumentos();
    } catch (err) {
      console.error("Erro ao enviar documento:", err);
      setErro(err.message || "Falha ao enviar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleVisualizarDocumento(doc) {
    if (!window.api?.documentos?.obter) return;
    setCarregandoPreview(true);
    try {
      const detalhado = await window.api.documentos.obter({ id: doc.id });
      setPreviewDoc(detalhado || doc);
    } catch (err) {
      console.error("Erro ao abrir pré-visualização:", err);
      setErro("Não foi possível pré-visualizar o documento.");
    } finally {
      setCarregandoPreview(false);
    }
  }

  async function handleBaixarDocumento(doc) {
    if (!window.api?.documentos?.baixar) return;
    try {
      const res = await window.api.documentos.baixar({ id: doc.id });
      if (res?.success) {
        setToast(`Ficheiro guardado em: ${res.filePath}`);
      }
    } catch (err) {
      console.error("Erro ao descarregar documento:", err);
      setErro("Erro ao descarregar o documento.");
    }
  }

  const documentosFiltrados = documentos.filter((doc) => {
    const catDoc = doc.categoria || doc.category || "outros";
    const nomeDoc = (doc.nomeOriginal || doc.name || "").toLowerCase();
    const passaCategoria = filtroCategoria === "todas" || catDoc === filtroCategoria;
    const passaBusca = !buscaNome.trim() || nomeDoc.includes(buscaNome.trim().toLowerCase());
    return passaCategoria && passaBusca;
  });

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          gap: "10px",
          color: "#64748b",
        }}
      >
        <Loader2 size={22} className="animate-spin" />
        <span>A carregar ficha do locatário...</span>
      </div>
    );
  }

  if (!locatario) {
    return (
      <div style={{ maxWidth: "900px", margin: "40px auto", textAlign: "center" }}>
        <p style={{ color: "#64748b", marginBottom: "16px" }}>Locatário não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate("/locatarios")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          Voltar para Locatários
        </button>
      </div>
    );
  }

  const dataInicioFormatada = formatarDataSomenteDia(imovelAssociado?.dataInicio);
  const dataTerminoFormatada = formatarDataSomenteDia(imovelAssociado?.dataFim);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "48px" }}>
      {/* Navegação topo */}
      <div style={{ marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => navigate("/locatarios")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#334155",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          Voltar para Locatários
        </button>
      </div>

      {/* Toast / Alertas */}
      {toast && (
        <div
          role="status"
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toast}</span>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{erro}</span>
        </div>
      )}

      {/* Cabeçalho / Ficha Principal do Locatário */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: "0 0 6px" }}>
              {locatario.nome}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "14px", color: "#475569" }}>
              <span>
                <strong>CPF/CNPJ:</strong> {locatario.cpf}
              </span>
              <span>
                <strong>Telefone:</strong> {locatario.telefone}
              </span>
              <span>
                <strong>E-mail:</strong> {locatario.email}
              </span>
            </div>
          </div>

          {imovelAssociado && (
            <button
              type="button"
              onClick={() => navigate(`/contratos?imovelId=${imovelAssociado.id}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#1877f2",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <FileText size={16} />
              Gerar / Ver Contrato
            </button>
          )}
        </div>

        {/* Secção de Locação Ativa e Data de Término do Contrato */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              <Building2 size={14} />
              <span>Imóvel Locado</span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "15px", fontWeight: "bold", color: "#0f172a" }}>
              {imovelAssociado ? imovelAssociado.titulo : "Nenhum imóvel associado"}
            </div>
            {imovelAssociado?.aluguel != null && (
              <div style={{ marginTop: "4px", fontSize: "13px", color: "#475569" }}>
                Aluguel:{" "}
                {Number(imovelAssociado.aluguel).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
          </div>

          {dataInicioFormatada && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                <Calendar size={14} />
                <span>Início do Contrato</span>
              </div>
              <div style={{ marginTop: "6px", fontSize: "16px", fontWeight: "bold", color: "#0f172a" }}>
                {dataInicioFormatada}
              </div>
            </div>
          )}

          {/* Campo visual claro mostrando a "Data de Término do Contrato" */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#1d4ed8",
                textTransform: "uppercase",
              }}
            >
              <ClipboardCheck size={14} />
              <span>Data de Término do Contrato</span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "17px", fontWeight: "bold", color: "#1e3a8a" }}>
              {dataTerminoFormatada ||
                (imovelAssociado ? "Prazo indeterminado / não informado" : "Sem contrato ativo")}
            </div>
          </div>
        </div>
      </div>

      {/* Secção de Dossiê de Documentos */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <FolderCheck size={20} color="#1877f2" />
          <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
            Dossiê de Documentos ({documentos.length})
          </h2>
        </div>

        {/* Formulário de Upload */}
        <form
          onSubmit={handleUploadDocumento}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px auto",
            gap: "12px",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#1877f2" : "#cbd5e1"}`,
              borderRadius: "8px",
              padding: "12px 16px",
              backgroundColor: dragOver ? "#eff6ff" : "#f8fafc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              color: "#334155",
            }}
          >
            <UploadCloud size={18} color="#1877f2" />
            <span>
              {arquivoSelecionado
                ? `${arquivoSelecionado.name} (${formatarTamanho(arquivoSelecionado.size)})`
                : "Clique ou arraste um ficheiro (PDF, JPG, PNG)..."}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          <select
            value={categoriaUpload}
            onChange={(e) => setCategoriaUpload(e.target.value)}
            style={{
              padding: "11px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              backgroundColor: "#ffffff",
            }}
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat.valor} value={cat.valor}>
                {cat.rotulo}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={enviando || !arquivoSelecionado}
            style={{
              padding: "11px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: enviando || !arquivoSelecionado ? "#94a3b8" : "#1877f2",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "14px",
              cursor: enviando || !arquivoSelecionado ? "not-allowed" : "pointer",
            }}
          >
            {enviando ? "A enviar..." : "Anexar"}
          </button>
        </form>

        {/* Barra de Filtros */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: "absolute", left: "12px", top: "11px" }}
            />
            <input
              type="text"
              placeholder="Pesquisar documento por nome..."
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat.valor} value={cat.valor}>
                {cat.rotulo}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Documentos */}
        {documentosFiltrados.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "24px 0", fontSize: "14px" }}>
            Nenhum documento encontrado para os filtros aplicados.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {documentosFiltrados.map((doc) => {
              const infoCat = obterInfoCategoria(doc.categoria || doc.category);
              const nome = doc.nomeOriginal || doc.name || "Documento";
              const isImg = /\.(jpg|jpeg|png)$/i.test(nome);

              return (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    {isImg ? (
                      <ImageIcon size={20} color="#2563eb" />
                    ) : (
                      <File size={20} color="#475569" />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "14px",
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {nome}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: infoCat.bg,
                            color: infoCat.cor,
                            border: `1px solid ${infoCat.border}`,
                            padding: "1px 8px",
                            borderRadius: "999px",
                            fontWeight: "600",
                          }}
                        >
                          {infoCat.rotulo}
                        </span>
                        <span>{formatarTamanho(doc.tamanhoBytes || doc.size)}</span>
                        <span>• Enviado em {formatarData(doc.criadoEm || doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleVisualizarDocumento(doc)}
                      disabled={carregandoPreview}
                      title="Pré-visualizar"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={15} />
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBaixarDocumento(doc)}
                      title="Descarregar"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      <Download size={15} />
                      Baixar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal simples de Preview */}
      {previewDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                {previewDoc.nomeOriginal || previewDoc.name || "Pré-visualização"}
              </strong>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "20px", overflow: "auto", flex: 1, textAlign: "center" }}>
              {previewDoc.dataUrl ? (
                previewDoc.dataUrl.startsWith("data:image/") ? (
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.nomeOriginal || "Documento"}
                    style={{ maxWidth: "100%", maxHeight: "65vh", borderRadius: "6px" }}
                  />
                ) : (
                  <iframe
                    src={previewDoc.dataUrl}
                    title="Pré-visualização PDF"
                    style={{ width: "100%", height: "65vh", border: "none" }}
                  />
                )
              ) : (
                <p style={{ color: "#64748b" }}>
                  Pré-visualização direta indisponível. Clique em "Baixar" para abrir o ficheiro.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}