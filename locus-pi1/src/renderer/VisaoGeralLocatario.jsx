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
  Filter,
  Building2,
  Calendar,
  FolderCheck,
  ShieldCheck,
  Loader2,
  ExternalLink,
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
  return CATEGORIAS.find((c) => c.valor === catValor) || {
    valor: catValor || "outros",
    rotulo: "Outros",
    cor: "#4b5563",
    bg: "#f3f4f6",
    border: "#e5e7eb",
  };
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
    const d = new Date(dataIso);
    return (
      d.toLocaleDateString("pt-BR") +
      " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return String(dataIso);
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

  // Feedback (toasts/alertas)
  const [toast, setToast] = useState(null);
  const [erro, setErro] = useState("");

  // Modal de Preview
  const [previewDoc, setPreviewDoc] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-dismiss do toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Carregar dados iniciais
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

        // 2. Tentar buscar imóvel associado através dos rentals
        if (window.api?.rentals?.list && window.api?.properties?.get) {
          try {
            const rentals = await window.api.rentals.list();
            const rentalAtivo = (rentals || []).find(
              (r) => String(r.tenantId) === String(id) && (!r.status || r.status === "ACTIVE")
            );
            if (rentalAtivo?.propertyId) {
              const prop = await window.api.properties.get(rentalAtivo.propertyId);
              setImovelAssociado({
                id: prop.id,
                titulo: prop.title || prop.address,
                aluguel: rentalAtivo.monthlyRent,
                dataInicio: rentalAtivo.startDate,
              });
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

  // Tratamento de arquivo selecionado
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
      setErro("Formato não suportado. Apenas arquivos PDF, JPG e PNG são permitidos.");
      return;
    }

    if (file.size === 0) {
      setErro("O arquivo selecionado está vazio.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErro("O arquivo excede o limite máximo permitido de 10 MB.");
      return;
    }

    setArquivoSelecionado(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!arquivoSelecionado) {
      setErro("Selecione um arquivo para upload.");
      return;
    }

    try {
      setEnviando(true);
      setErro("");

      const arrayBuffer = await arquivoSelecionado.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      await window.api.documentos.upload({
        locatarioId: id,
        nomeArquivo: arquivoSelecionado.name,
        conteudo: uint8Array,
        categoria: categoriaUpload,
      });

      setToast({
        tipo: "sucesso",
        mensagem: `Documento "${arquivoSelecionado.name}" enviado com sucesso!`,
      });

      setArquivoSelecionado(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await carregarDocumentos();
    } catch (err) {
      console.error("Erro ao fazer upload do documento:", err);
      setErro(err.message || "Erro ao salvar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleBaixar(docId, nomeOriginal) {
    try {
      const res = await window.api.documentos.baixar({ id: docId });
      if (res.salvo) {
        setToast({
          tipo: "sucesso",
          mensagem: `Documento "${nomeOriginal}" salvo com sucesso!`,
        });
      }
    } catch (err) {
      console.error("Erro ao baixar documento:", err);
      setErro(err.message || "Não foi possível baixar o documento.");
    }
  }

  async function handleVisualizar(doc) {
    try {
      setCarregandoPreview(true);
      setErro("");

      const res = await window.api.documentos.obter({ id: doc.id });
      const blob = new Blob([res.conteudo], { type: res.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      setPreviewDoc({
        id: doc.id,
        nomeOriginal: res.nomeOriginal,
        mimeType: res.mimeType,
        categoria: doc.categoria,
        url: blobUrl,
      });

      if (dialogRef.current) {
        dialogRef.current.showModal();
      }
    } catch (err) {
      console.error("Erro ao visualizar documento:", err);
      setErro(err.message || "Não foi possível carregar a pré-visualização.");
    } finally {
      setCarregandoPreview(false);
    }
  }

  function fecharPreview() {
    if (previewDoc?.url) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewDoc(null);
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  }

  async function handleAtualizarCategoria(docId, novaCat) {
    try {
      await window.api.documentos.atualizarCategoria({
        id: docId,
        categoria: novaCat,
      });

      setDocumentos((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, categoria: novaCat } : d))
      );

      setToast({
        tipo: "sucesso",
        mensagem: "Categoria atualizada com sucesso!",
      });
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      setErro(err.message || "Erro ao atualizar categoria do documento.");
    }
  }

  // Filtragem de documentos na visualização
  const documentosFiltrados = documentos.filter((doc) => {
    const atendeCategoria =
      filtroCategoria === "todas" || doc.categoria === filtroCategoria;
    const atendeBusca =
      !buscaNome.trim() ||
      doc.nomeOriginal.toLowerCase().includes(buscaNome.toLowerCase().trim());
    return atendeCategoria && atendeBusca;
  });

  // Métricas do dossiê
  const totalBytes = documentos.reduce((acc, d) => acc + (d.tamanhoBytes || 0), 0);
  const temIdentificacao = documentos.some((d) => d.categoria === "identificacao");
  const temRenda = documentos.some((d) => d.categoria === "comprovante_renda");
  const statusDossie =
    temIdentificacao && temRenda
      ? { texto: "Dossiê Completo", cor: "#15803d", bg: "#dcfce7" }
      : { texto: "Documentação Pendente", cor: "#b45309", bg: "#fef3c7" };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "#4b5563" }}>
        <Loader2 size={32} className="animate-spin" style={{ marginRight: "12px", color: "#2563eb" }} />
        <span>Carregando dossiê do locatário...</span>
      </div>
    );
  }

  if (!locatario) {
    return (
      <div style={{ maxWidth: "800px", margin: "40px auto", padding: "32px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center" }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>
          Locatário não encontrado
        </h2>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>
          Não foi possível localizar o cadastro referente ao identificador: <code>{id}</code>.
        </p>
        <button
          onClick={() => navigate("/locatarios")}
          style={{
            backgroundColor: "#2563eb",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "6px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Voltar para Locatários
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Barra de Notificação / Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#10b981",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 9999,
            fontWeight: "500",
          }}
        >
          <CheckCircle2 size={20} />
          <span>{toast.mensagem}</span>
        </div>
      )}

      {/* Banner de Erro */}
      {erro && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} />
            <span>{erro}</span>
          </div>
          <button
            onClick={() => setErro("")}
            style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Botão de Retorno */}
      <div>
        <button
          onClick={() => navigate("/locatarios")}
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            padding: "4px 0",
          }}
        >
          <ArrowLeft size={18} />
          Voltar para Lista de Locatários
        </button>
      </div>

      {/* Card Cabeçalho do Locatário */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#dbeafe",
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            {locatario.nome
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
                {locatario.nome}
              </h1>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: statusDossie.bg,
                  color: statusDossie.cor,
                }}
              >
                {statusDossie.texto}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px 24px", marginTop: "12px", fontSize: "14px", color: "#475569" }}>
              <p style={{ margin: 0 }}><strong>CPF/CNPJ:</strong> {locatario.cpf}</p>
              <p style={{ margin: 0 }}><strong>Telefone:</strong> {locatario.telefone}</p>
              <p style={{ margin: 0 }}><strong>E-mail:</strong> {locatario.email}</p>
              {imovelAssociado ? (
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong>Imóvel:</strong> {imovelAssociado.titulo}
                  <button
                    onClick={() => navigate(`/imoveis/${imovelAssociado.id}`)}
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", display: "inline-flex", alignItems: "center", padding: 0 }}
                    title="Ver Visão Geral do Imóvel"
                  >
                    <ExternalLink size={14} />
                  </button>
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  <strong>Imóvel:</strong> Nenhum vinculado{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/imoveis")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      cursor: "pointer",
                      fontSize: "13px",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                    title="Selecione um imóvel para associar este locatário"
                  >
                    (vincular a um imóvel)
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {imovelAssociado && (
            <button
              type="button"
              onClick={() => navigate(`/vistorias?imovelId=${imovelAssociado.id}`)}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
                backgroundColor: "#f0fdf4",
                color: "#166534",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ClipboardCheck size={16} color="#16a34a" />
              Vistorias
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(imovelAssociado ? `/contratos?imovelId=${imovelAssociado.id}` : "/contratos")}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FileText size={16} />
            Gerar Contrato
          </button>
        </div>
      </div>

      {/* Grid de Resumo e Checklist do Dossiê */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600" }}>Total de Documentos</span>
            <FolderCheck size={18} color="#2563eb" />
          </div>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
            {documentos.length} <span style={{ fontSize: "14px", fontWeight: "normal", color: "#64748b" }}>arquivos</span>
          </p>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Espaço ocupado: {formatarTamanho(totalBytes)}
          </span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600" }}>Documento de Identificação</span>
            {temIdentificacao ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#d97706" />}
          </div>
          <p style={{ fontSize: "16px", fontWeight: "bold", color: temIdentificacao ? "#15803d" : "#b45309", margin: "4px 0" }}>
            {temIdentificacao ? "Entregue e Validado" : "Pendente de Envio"}
          </p>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Obrigatório para locação</span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600" }}>Comprovante de Renda</span>
            {temRenda ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#d97706" />}
          </div>
          <p style={{ fontSize: "16px", fontWeight: "bold", color: temRenda ? "#15803d" : "#b45309", margin: "4px 0" }}>
            {temRenda ? "Entregue e Validado" : "Pendente de Envio"}
          </p>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Obrigatório para análise de crédito</span>
        </div>
      </div>

      {/* Seção Principal do Dossiê (Upload e Lista) */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: "0 0 4px" }}>
              Dossiê de Documentos
            </h2>
            <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
              Faça upload, visualize em tela cheia e baixe os documentos originais do locatário.
            </p>
          </div>
        </div>

        {/* Formulário de Upload Moderno com Drag & Drop */}
        <form onSubmit={handleUpload} style={{ marginBottom: "28px" }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "#2563eb" : "#cbd5e1"}`,
              backgroundColor: dragOver ? "#eff6ff" : "#f8fafc",
              borderRadius: "10px",
              padding: "24px",
              textAlign: "center",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ maxWidth: "560px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#dbeafe",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UploadCloud size={24} />
              </div>

              <div>
                <p style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b", margin: "0 0 4px" }}>
                  Arraste e solte o documento aqui ou{" "}
                  <label
                    htmlFor="file-upload"
                    style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                  >
                    escolha do computador
                  </label>
                </p>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  Formatos aceitos: <strong>PDF, JPG, JPEG e PNG</strong> (tamanho máximo de 10 MB)
                </p>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf, .jpg, .jpeg, .png"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>

              {/* Arquivo selecionado no formulário */}
              {arquivoSelecionado && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    backgroundColor: "#ffffff",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #bfdbfe",
                    fontSize: "13px",
                    color: "#1e3a8a",
                  }}
                >
                  <FileText size={16} color="#2563eb" />
                  <span style={{ fontWeight: "600" }}>{arquivoSelecionado.name}</span>
                  <span style={{ color: "#64748b" }}>({formatarTamanho(arquivoSelecionado.size)})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setArquivoSelecionado(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Seletor de Categoria e Botão de Ação */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label htmlFor="categoria-select" style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                    Categoria:
                  </label>
                  <select
                    id="categoria-select"
                    value={categoriaUpload}
                    onChange={(e) => setCategoriaUpload(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      color: "#1e293b",
                      cursor: "pointer",
                    }}
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.valor} value={cat.valor}>
                        {cat.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!arquivoSelecionado || enviando}
                  style={{
                    backgroundColor: !arquivoSelecionado || enviando ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    padding: "8px 18px",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: !arquivoSelecionado || enviando ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {enviando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      Enviar para o Dossiê
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Barra de Filtro e Busca */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginRight: "4px" }}>
              Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setFiltroCategoria("todas")}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: filtroCategoria === "todas" ? "#2563eb" : "#cbd5e1",
                backgroundColor: filtroCategoria === "todas" ? "#2563eb" : "#ffffff",
                color: filtroCategoria === "todas" ? "#ffffff" : "#475569",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Todos ({documentos.length})
            </button>
            {CATEGORIAS.map((cat) => {
              const contagem = documentos.filter((d) => d.categoria === cat.valor).length;
              const ativa = filtroCategoria === cat.valor;
              return (
                <button
                  key={cat.valor}
                  type="button"
                  onClick={() => setFiltroCategoria(cat.valor)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: ativa ? cat.cor : "#cbd5e1",
                    backgroundColor: ativa ? cat.cor : "#ffffff",
                    color: ativa ? "#ffffff" : "#475569",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {cat.rotulo.split(" ")[0]} ({contagem})
                </button>
              );
            })}
          </div>

          <div style={{ position: "relative", minWidth: "240px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Pesquisar documento..."
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Tabela de Documentos Cadastrados */}
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Documento</th>
                <th style={{ padding: "12px 16px" }}>Categoria</th>
                <th style={{ padding: "12px 16px" }}>Tamanho</th>
                <th style={{ padding: "12px 16px" }}>Data de Envio</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                    <File size={36} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                    <p style={{ margin: "0 0 4px", fontWeight: "600", color: "#334155" }}>
                      Nenhum documento encontrado
                    </p>
                    <span style={{ fontSize: "13px" }}>
                      {documentos.length === 0
                        ? "Este locatário ainda não possui documentos arquivados."
                        : "Nenhum arquivo corresponde aos filtros aplicados."}
                    </span>
                  </td>
                </tr>
              ) : (
                documentosFiltrados.map((doc, idx) => {
                  const infoCat = obterInfoCategoria(doc.categoria);
                  const isPdf = doc.mimeType?.includes("pdf") || doc.nomeOriginal.toLowerCase().endsWith(".pdf");
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: idx < documentosFiltrados.length - 1 ? "1px solid #f1f5f9" : "none",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                        transition: "background-color 0.15s",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {isPdf ? (
                            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <FileText size={18} />
                            </div>
                          ) : (
                            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <div>
                            <p style={{ margin: 0, fontWeight: "600", color: "#1e293b", wordBreak: "break-all" }}>
                              {doc.nomeOriginal}
                            </p>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {doc.mimeType}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <select
                          value={doc.categoria}
                          onChange={(e) => handleAtualizarCategoria(doc.id, e.target.value)}
                          title="Clique para alterar a categoria"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "16px",
                            border: `1px solid ${infoCat.border}`,
                            backgroundColor: infoCat.bg,
                            color: infoCat.cor,
                            fontWeight: "600",
                            fontSize: "12px",
                            cursor: "pointer",
                            outline: "none",
                          }}
                        >
                          {CATEGORIAS.map((cat) => (
                            <option key={cat.valor} value={cat.valor}>
                              {cat.rotulo}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: "12px 16px", color: "#475569", fontSize: "13px" }}>
                        {formatarTamanho(doc.tamanhoBytes)}
                      </td>

                      <td style={{ padding: "12px 16px", color: "#475569", fontSize: "13px" }}>
                        {formatarData(doc.criadoEm)}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleVisualizar(doc)}
                            style={{
                              backgroundColor: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Visualizar documento"
                          >
                            <Eye size={15} />
                            Visualizar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBaixar(doc.id, doc.nomeOriginal)}
                            style={{
                              backgroundColor: "#f8fafc",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Baixar para o computador"
                          >
                            <Download size={15} />
                            Baixar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nativo de Pré-visualização de Documento */}
      <dialog
        ref={dialogRef}
        onCancel={fecharPreview}
        style={{
          padding: 0,
          border: "none",
          borderRadius: "12px",
          width: "90vw",
          maxWidth: "960px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        {previewDoc && (
          <div style={{ display: "flex", flexDirection: "column", height: "85vh" }}>
            {/* Cabeçalho do Modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {previewDoc.mimeType?.includes("pdf") ? (
                  <FileText size={20} color="#ef4444" />
                ) : (
                  <ImageIcon size={20} color="#0284c7" />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1e293b" }}>
                    {previewDoc.nomeOriginal}
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {obterInfoCategoria(previewDoc.categoria).rotulo}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleBaixar(previewDoc.id, previewDoc.nomeOriginal)}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Download size={14} />
                  Baixar Arquivo
                </button>

                <button
                  type="button"
                  onClick={fecharPreview}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#64748b",
                    padding: "6px",
                    cursor: "pointer",
                    borderRadius: "6px",
                  }}
                  title="Fechar visualização"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Preview */}
            <div style={{ flex: 1, backgroundColor: "#f1f5f9", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
              {previewDoc.mimeType?.includes("pdf") ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.nomeOriginal}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "16px", boxSizing: "border-box" }}>
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.nomeOriginal}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                  />
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={fecharPreview}
                style={{
                  backgroundColor: "#e2e8f0",
                  color: "#334155",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}