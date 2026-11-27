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
  { valor: "identificacao", rotulo: "Identificação (RG / CNH / CPF)", cor: "var(--color-primary)", bg: "var(--color-primary-container)", border: "var(--color-outline-variant)" },
  { valor: "comprovante_renda", rotulo: "Comprovante de Renda", cor: "var(--color-success)", bg: "var(--color-success-container)", border: "var(--color-success)" },
  { valor: "antecedentes", rotulo: "Antecedentes Criminais", cor: "var(--color-tertiary)", bg: "var(--color-primary-container)", border: "var(--color-outline-variant)" },
  { valor: "contrato", rotulo: "Contrato", cor: "var(--color-warning)", bg: "var(--color-warning-container)", border: "var(--color-warning)" },
  { valor: "outros", rotulo: "Outros Documentos", cor: "var(--color-on-surface-variant)", bg: "var(--color-primary-container)", border: "var(--color-outline-variant)" },
];

function obterInfoCategoria(catValor) {
  return (
    CATEGORIAS.find((c) => c.valor === catValor) || {
      valor: catValor || "outros",
      rotulo: "Outros",
      cor: "var(--color-on-surface-variant)",
      bg: "var(--color-primary-container)",
      border: "var(--color-outline-variant)",
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
          padding: "var(--space-8)",
          gap: "var(--space-2)",
          color: "var(--color-on-surface)",
        }}
      >
        <Loader2 size={22} className="animate-spin" />
        <span>A carregar ficha do locatário...</span>
      </div>
    );
  }

  if (!locatario) {
    return (
      <div style={{ maxWidth: "900px", margin: "var(--space-6) auto", textAlign: "center" }}>
        <p style={{ color: "var(--color-on-surface)", marginBottom: "var(--space-4)" }}>Locatário não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate("/locatarios")}
          style={{
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-outline-variant)",
            background: "var(--color-surface)",
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
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "var(--space-7)" }}>
      {/* Navegação topo */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          onClick={() => navigate("/locatarios")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-outline-variant)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-on-surface)",
            fontSize: "var(--font-body-md)",
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
            backgroundColor: "var(--color-success-container)",
            border: "1px solid var(--color-success)",
            color: "var(--color-success)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-body-md)",
          }}
        >
          <CheckCircle2 size={18} color="var(--color-success)" />
          <span>{toast}</span>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          style={{
            backgroundColor: "var(--color-error-container)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-body-md)",
          }}
        >
          <AlertCircle size={18} color="var(--color-error)" />
          <span>{erro}</span>
        </div>
      )}

      {/* Cabeçalho / Ficha Principal do Locatário */}
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-outline-variant)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-5)",
          marginBottom: "var(--space-5)",
          boxShadow: "var(--elevation-1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <h1 style={{ fontSize: "var(--font-headline-sm)", fontWeight: "bold", color: "var(--color-on-surface)", margin: "0 0 var(--space-1)" }}>
              {locatario.nome}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", fontSize: "var(--font-body-md)", color: "var(--color-on-surface)" }}>
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
                gap: "var(--space-2)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-2) var(--space-4)",
                fontWeight: "600",
                fontSize: "var(--font-body-md)",
                cursor: "pointer",
              }}
            >
              <FileText size={16} />
              Gerar / Ver Contrato
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/pagamentos?tenantId=${id}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              backgroundColor: "var(--color-info)",
              color: "var(--color-on-info)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-4)",
              fontWeight: "600",
              fontSize: "var(--font-body-md)",
              cursor: "pointer",
            }}
          >
            <FileText size={16} />
            Histórico financeiro
          </button>
        </div>

        {/* Secção de Locação Ativa e Data de Término do Contrato */}
        <div
          style={{
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--color-outline-variant)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-primary-container)",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-3) var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                fontSize: "var(--font-body-sm)",
                fontWeight: "700",
                color: "var(--color-on-surface)",
                textTransform: "uppercase",
              }}
            >
              <Building2 size={14} />
              <span>Imóvel Locado</span>
            </div>
            <div style={{ marginTop: "var(--space-1)", fontSize: "var(--font-body-md)", fontWeight: "bold", color: "var(--color-on-surface)" }}>
              {imovelAssociado ? imovelAssociado.titulo : "Nenhum imóvel associado"}
            </div>
            {imovelAssociado?.aluguel != null && (
              <div style={{ marginTop: "var(--space-1)", fontSize: "var(--font-body-md)", color: "var(--color-on-surface)" }}>
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
                backgroundColor: "var(--color-primary-container)",
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-3) var(--space-4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  fontSize: "var(--font-body-sm)",
                  fontWeight: "700",
                  color: "var(--color-on-surface)",
                  textTransform: "uppercase",
                }}
              >
                <Calendar size={14} />
                <span>Início do Contrato</span>
              </div>
              <div style={{ marginTop: "var(--space-1)", fontSize: "var(--font-body-lg)", fontWeight: "bold", color: "var(--color-on-surface)" }}>
                {dataInicioFormatada}
              </div>
            </div>
          )}

          {/* Campo visual claro mostrando a "Data de Término do Contrato" */}
          <div
            style={{
              backgroundColor: "var(--color-primary-container)",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-3) var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                fontSize: "var(--font-body-sm)",
                fontWeight: "700",
                color: "var(--color-on-surface)",
                textTransform: "uppercase",
              }}
            >
              <ClipboardCheck size={14} />
              <span>Data de Término do Contrato</span>
            </div>
            <div style={{ marginTop: "var(--space-1)", fontSize: "var(--font-body-lg)", fontWeight: "bold", color: "var(--color-on-surface)" }}>
              {dataTerminoFormatada ||
                (imovelAssociado ? "Prazo indeterminado / não informado" : "Sem contrato ativo")}
            </div>
          </div>
        </div>
      </div>

      {/* Secção de Dossiê de Documentos */}
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-outline-variant)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-5)",
          boxShadow: "var(--elevation-1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <FolderCheck size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: "var(--font-title-lg)", fontWeight: "bold", color: "var(--color-on-surface)", margin: 0 }}>
            Dossiê de Documentos ({documentos.length})
          </h2>
        </div>

        {/* Formulário de Upload */}
        <form
          onSubmit={handleUploadDocumento}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px auto",
            gap: "var(--space-3)",
            alignItems: "center",
            marginBottom: "var(--space-4)",
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
              border: `2px dashed ${dragOver ? "var(--color-primary)" : "var(--color-primary-container)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: dragOver ? "var(--color-primary-container)" : "var(--color-primary-container)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--font-body-md)",
              color: "var(--color-on-surface)",
            }}
          >
            <UploadCloud size={18} color="var(--color-primary)" />
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
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-outline-variant)",
              fontSize: "var(--font-body-md)",
              backgroundColor: "var(--color-surface)",
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
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-sm)",
              border: "none",
              backgroundColor: enviando || !arquivoSelecionado ? "var(--color-primary-container)" : "var(--color-primary)",
              color: enviando || !arquivoSelecionado ? "var(--color-on-primary-container)" : "var(--color-on-primary)",
              fontWeight: "600",
              fontSize: "var(--font-body-md)",
              cursor: enviando || !arquivoSelecionado ? "not-allowed" : "pointer",
            }}
          >
            {enviando ? "A enviar..." : "Anexar"}
          </button>
        </form>

        {/* Barra de Filtros */}
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search
              size={16}
              color="var(--color-primary)"
              style={{ position: "absolute", left: "12px", top: "11px" }}
            />
            <input
              type="text"
              placeholder="Pesquisar documento por nome..."
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3) var(--space-2) var(--space-6)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-outline-variant)",
                fontSize: "var(--font-body-md)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-outline-variant)",
              fontSize: "var(--font-body-md)",
              backgroundColor: "var(--color-surface)",
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
          <p style={{ textAlign: "center", color: "var(--color-on-surface)", padding: "var(--space-5) 0", fontSize: "var(--font-body-md)" }}>
            Nenhum documento encontrado para os filtros aplicados.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
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
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-outline-variant)",
                    backgroundColor: "var(--color-primary-container)",
                    gap: "var(--space-3)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                    {isImg ? (
                      <ImageIcon size={20} color="var(--color-primary)" />
                    ) : (
                      <File size={20} color="var(--color-primary)" />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "var(--font-body-md)",
                          color: "var(--color-on-surface)",
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
                          gap: "var(--space-2)",
                          marginTop: "var(--space-1)",
                          fontSize: "var(--font-body-sm)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: infoCat.bg,
                            color: infoCat.cor,
                            border: `1px solid ${infoCat.border}`,
                            padding: "var(--space-1) var(--space-2)",
                            borderRadius: "var(--radius-full)",
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

                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      onClick={() => handleVisualizarDocumento(doc)}
                      disabled={carregandoPreview}
                      title="Pré-visualizar"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                        padding: "var(--space-1) var(--space-2)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-outline-variant)",
                        backgroundColor: "var(--color-surface)",
                        fontSize: "var(--font-body-md)",
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
                        gap: "var(--space-1)",
                        padding: "var(--space-1) var(--space-2)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-outline-variant)",
                        backgroundColor: "var(--color-surface)",
                        fontSize: "var(--font-body-md)",
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
            backgroundColor: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "var(--space-4)",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: "var(--radius-md)",
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
                padding: "var(--space-3) var(--space-4)",
                borderBottom: "1px solid var(--color-outline-variant)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)" }}>
                {previewDoc.nomeOriginal || previewDoc.name || "Pré-visualização"}
              </strong>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-on-surface)" }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "var(--space-4)", overflow: "auto", flex: 1, textAlign: "center" }}>
              {previewDoc.dataUrl ? (
                previewDoc.dataUrl.startsWith("data:image/") ? (
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.nomeOriginal || "Documento"}
                    style={{ maxWidth: "100%", maxHeight: "65vh", borderRadius: "var(--radius-sm)" }}
                  />
                ) : (
                  <iframe
                    src={previewDoc.dataUrl}
                    title="Pré-visualização PDF"
                    style={{ width: "100%", height: "65vh", border: "none" }}
                  />
                )
              ) : (
                <p style={{ color: "var(--color-on-surface)" }}>
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