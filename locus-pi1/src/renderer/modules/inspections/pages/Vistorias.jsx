import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Camera,
  Video,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  Calendar,
  Eye,
  Info,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import BotaoVoltar from "../../../shared/common/components/BotaoVoltar";
import {
  adaptPropertyOverview,
  mediaFileUrl,
} from "../../properties/domain/propertyOverview.mjs";

export default function Vistorias() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const imovelIdParam = searchParams.get("imovelId");
  const tipoParam = searchParams.get("tipo"); // "ENTRY" | "EXIT"
  const abaParam = searchParams.get("aba"); // "registrar" | "consultar"
  const vistoriaIdParam = searchParams.get("vistoriaId");
  const contratoIdParam = searchParams.get("contratoId");

  const [abaAtiva, setAbaAtiva] = useState(
    abaParam === "consultar" || (!tipoParam && imovelIdParam && abaParam !== "registrar")
      ? "consultar"
      : "registrar"
  );
  const [imoveis, setImoveis] = useState([]);
  const [carregandoImoveis, setCarregandoImoveis] = useState(true);

  // Form states
  const [imovelId, setImovelId] = useState(imovelIdParam || "");
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState(contratoIdParam || "");
  const [tipoVistoria, setTipoVistoria] = useState(
    tipoParam === "EXIT" ? "EXIT" : "ENTRY"
  );
  const [inspectedAt, setInspectedAt] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [description, setDescription] = useState("");
  const [reportReference, setReportReference] = useState("");
  const [arquivosSelecionados, setArquivosSelecionados] = useState([]); // { file, path, preview, type, name, size }

  // Status & Feedback
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Consultation state
  const [filtroImovelId, setFiltroImovelId] = useState(imovelIdParam || "");
  const [listaVistorias, setListaVistorias] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [vistoriaDetalhe, setVistoriaDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  // Auto-open inspection details modal if requested by URL query param
  useEffect(() => {
    if (vistoriaIdParam) {
      abrirDetalhesVistoria(vistoriaIdParam);
    }
  }, [vistoriaIdParam]);

  // Load properties on mount
  useEffect(() => {
    let active = true;
    async function loadProperties() {
      try {
        setCarregandoImoveis(true);
        const data = await window.api.properties.list();
        if (active) setImoveis(data || []);
      } catch (err) {
        console.error("Erro ao carregar imóveis:", err);
      } finally {
        if (active) setCarregandoImoveis(false);
      }
    }
    loadProperties();
    return () => {
      active = false;
    };
  }, []);

  // When imovelId changes, load contracts for that property
  useEffect(() => {
    let active = true;
    async function loadContracts() {
      if (!imovelId) {
        setContratos([]);
        setContratoId("");
        return;
      }
      try {
        const overview = await window.api.properties.overview(imovelId);
        let tenantMap = {};
        try {
          const clients = await window.api.clients?.list();
          if (Array.isArray(clients)) {
            for (const c of clients) tenantMap[c.id] = c.name;
          }
        } catch (_) {}
        const modelo = adaptPropertyOverview(overview, tenantMap);
        if (active && modelo?.contratos) {
          // Filtrar contratos válidos (não cancelados)
          const validos = modelo.contratos.filter(
            (c) => c.status !== "Cancelado"
          );
          setContratos(validos);
          if (validos.length > 0) {
            if (contratoIdParam && validos.some((c) => c.id === contratoIdParam)) {
              setContratoId(contratoIdParam);
            } else {
              // Prioriza o contrato vigente ou o mais recente
              const vigente = validos.find((c) => c.status === "Vigente");
              setContratoId(vigente ? vigente.id : validos[0].id);
            }
          } else {
            setContratoId("");
          }
        }
      } catch (err) {
        console.error("Erro ao carregar contratos do imóvel:", err);
      }
    }
    loadContracts();
    return () => {
      active = false;
    };
  }, [imovelId, contratoIdParam]);

  // When filtroImovelId changes or when switching to 'consultar', load inspection list
  useEffect(() => {
    let active = true;
    async function fetchInspections() {
      if (!filtroImovelId) {
        setListaVistorias([]);
        return;
      }
      try {
        setCarregandoLista(true);
        const list = await window.api.inspections.list({
          propertyId: filtroImovelId,
        });
        if (active) setListaVistorias(list || []);
      } catch (err) {
        console.error("Erro ao listar vistorias:", err);
        if (active) setListaVistorias([]);
      } finally {
        if (active) setCarregandoLista(false);
      }
    }
    if (abaAtiva === "consultar" || filtroImovelId) {
      fetchInspections();
    }
    return () => {
      active = false;
    };
  }, [filtroImovelId, abaAtiva]);

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/x-matroska",
      "video/webm",
    ];

    const novos = [];
    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
      const isVideo = [".mp4", ".mkv", ".webm"].includes(ext);

      if (!isImage && !isVideo) {
        alert(
          `O arquivo "${file.name}" possui formato inválido. Use JPG, PNG, WEBP, MP4, MKV ou WEBM.`
        );
        continue;
      }

      let filePath = "";
      if (window.api?.getPathForFile) {
        try {
          filePath = window.api.getPathForFile(file);
        } catch (err) {
          console.warn("Não foi possível obter caminho pelo webUtils:", err);
        }
      }

      novos.push({
        file,
        path: filePath,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: isImage ? "IMAGE" : "VIDEO",
        preview: isImage ? URL.createObjectURL(file) : null,
      });
    }

    setArquivosSelecionados((prev) => [...prev, ...novos]);
    e.target.value = "";
  }

  function excluirArquivo(index) {
    setArquivosSelecionados((prev) => {
      const item = prev[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensagemErro("");
    setMensagemSucesso("");

    if (!imovelId) {
      setMensagemErro("Selecione o imóvel para a vistoria.");
      return;
    }
    if (!contratoId) {
      setMensagemErro(
        "Selecione o contrato associado. Caso o imóvel não possua contrato cadastrado, crie um antes da vistoria."
      );
      return;
    }
    if (!description.trim()) {
      setMensagemErro("A descrição do estado do imóvel é obrigatória.");
      return;
    }

    const now = new Date();
    const [ano, mes, dia] = inspectedAt.split("-").map(Number);
    const dataVistoria = new Date(ano, mes - 1, dia);
    const dataHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dataVistoria > dataHoje) {
      setMensagemErro("A data da vistoria não pode estar no futuro.");
      return;
    }

    const timestampData =
      dataVistoria.getTime() === dataHoje.getTime()
        ? Date.now()
        : new Date(ano, mes - 1, dia, 12, 0, 0).getTime();

    const sourceFilePaths = arquivosSelecionados
      .map((a) => a.path)
      .filter(Boolean);

    if (
      arquivosSelecionados.length > 0 &&
      sourceFilePaths.length !== arquivosSelecionados.length
    ) {
      setMensagemErro(
        "Não foi possível obter o caminho dos arquivos no sistema operacional. Verifique as permissões de acesso."
      );
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        propertyId: imovelId,
        contractId: contratoId,
        inspectedAt: timestampData,
        description: description.trim(),
        reportReference: reportReference.trim() || null,
        sourceFilePaths,
      };

      let vistoriaCriada;
      if (tipoVistoria === "EXIT") {
        vistoriaCriada = await window.api.inspections.recordExit(payload);
        setMensagemSucesso(
          `Vistoria de SAÍDA registrada com sucesso! (ID: ${vistoriaCriada.id.substring(
            0,
            8
          )}...) ${
            sourceFilePaths.length > 0
              ? `Foram anexadas e armazenadas com segurança ${sourceFilePaths.length} mídias.`
              : ""
          }`
        );
      } else {
        vistoriaCriada = await window.api.inspections.recordEntry(payload);
        setMensagemSucesso(
          `Vistoria de ENTRADA registrada com sucesso! (ID: ${vistoriaCriada.id.substring(
            0,
            8
          )}...) ${
            sourceFilePaths.length > 0
              ? `Foram anexadas e armazenadas com segurança ${sourceFilePaths.length} mídias.`
              : ""
          }`
        );
      }

      // Reset form fields
      setDescription("");
      setReportReference("");
      setArquivosSelecionados([]);
      setFiltroImovelId(imovelId);
      setAbaAtiva("consultar");
    } catch (err) {
      console.error("Erro ao registrar vistoria:", err);
      setMensagemErro(err.message || "Erro ao registrar vistoria.");
    } finally {
      setSalvando(false);
    }
  }

  async function abrirDetalhesVistoria(id) {
    try {
      setCarregandoDetalhe(true);
      const detalhe = await window.api.inspections.get(id);
      setVistoriaDetalhe(detalhe);
    } catch (err) {
      console.error("Erro ao carregar detalhes da vistoria:", err);
      alert("Não foi possível carregar os detalhes e anexos da vistoria.");
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "var(--space-6)" }}>
      <BotaoVoltar
        destino={imovelIdParam ? `/imoveis/${imovelIdParam}` : "/imoveis"}
        texto={imovelIdParam ? "Voltar para Detalhes do Imóvel" : "Voltar para Imóveis"}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", borderBottom: "1px solid var(--color-outline-variant)" }}>
        <button
          type="button"
          onClick={() => setAbaAtiva("registrar")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3) var(--space-4)",
            fontSize: "var(--font-body-md)",
            fontWeight: "600",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: abaAtiva === "registrar" ? "3px solid var(--color-primary)" : "3px solid transparent",
            color: abaAtiva === "registrar" ? "var(--color-primary)" : "var(--color-primary)",
            cursor: "pointer",
          }}
        >
          <ClipboardCheck size={18} />
          Registrar Nova Vistoria
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva("consultar")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3) var(--space-4)",
            fontSize: "var(--font-body-md)",
            fontWeight: "600",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: abaAtiva === "consultar" ? "3px solid var(--color-primary)" : "3px solid transparent",
            color: abaAtiva === "consultar" ? "var(--color-primary)" : "var(--color-primary)",
            cursor: "pointer",
          }}
        >
          <Eye size={18} />
          Consultar Histórico e Mídias
        </button>
      </div>

      {/* Alerts */}
      {mensagemSucesso && (
        <div
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
          }}
        >
          <CheckCircle2 size={20} color="var(--color-success)" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div
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
          }}
        >
          <AlertCircle size={20} color="var(--color-error)" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* ABA 1: REGISTRAR VISTORIA */}
      {abaAtiva === "registrar" && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-outline-variant)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-5)",
            boxShadow: "var(--elevation-1)",
          }}
        >
          <h3 style={{ fontSize: "var(--font-title-lg)", fontWeight: "bold", color: "var(--color-on-surface)", marginTop: 0, marginBottom: "var(--space-4)" }}>
            Dados da Vistoria
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            {/* Imovel */}
            <div>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Imóvel *
              </label>
              <select
                value={imovelId}
                onChange={(e) => setImovelId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                }}
              >
                <option value="">Selecione um imóvel...</option>
                {imoveis.map((im) => (
                  <option key={im.id} value={im.id}>
                    {im.title || "Imóvel"} - {im.address} ({im.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Contrato */}
            <div>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Contrato Associado *
              </label>
              <select
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                required
                disabled={!imovelId || contratos.length === 0}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                  backgroundColor: !imovelId || contratos.length === 0 ? "var(--color-surface-variant)" : "var(--color-surface)",
                }}
              >
                <option value="">
                  {!imovelId
                    ? "Selecione o imóvel primeiro"
                    : contratos.length === 0
                    ? "Nenhum contrato ativo encontrado"
                    : "Selecione o contrato..."}
                </option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.locatario}
                    {contratos.filter((contrato) => contrato.tenantId === c.tenantId).length > 1 && c.inicio
                      ? ` (Início: ${c.inicio})`
                      : ""}
                  </option>
                ))}
              </select>
              {imovelId && contratos.length === 0 && (
                <div
                  style={{
                    marginTop: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    backgroundColor: "var(--color-warning-container)",
                    border: "1px solid var(--color-warning)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-body-sm)",
                    color: "var(--color-warning)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                  }}
                >
                  <span>
                    <strong>Atenção:</strong> Este imóvel não possui locação/contrato ativo registrado. O dossiê de documentos armazena os arquivos pessoais do locatário, mas para habilitar a vistoria é necessário formalizar a locação associando o locatário ao imóvel.
                  </span>
                  <button
                    className="ui-action ui-action--primary"
                    type="button"
                    onClick={() => navigate(`/imoveis/${imovelId}`)}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Ir para Visão Geral do Imóvel para Associar Locatário &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            {/* Tipo de Vistoria */}
            <div>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Tipo de Vistoria *
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={() => setTipoVistoria("ENTRY")}
                  style={{
                    flex: 1,
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: tipoVistoria === "ENTRY" ? "2px solid var(--color-success)" : "1px solid var(--color-outline-variant)",
                    backgroundColor: tipoVistoria === "ENTRY" ? "var(--color-success-container)" : "var(--color-surface-variant)",
                    color: tipoVistoria === "ENTRY" ? "var(--color-success)" : "var(--color-on-surface)",
                    fontWeight: "600",
                    fontSize: "var(--font-body-md)",
                    cursor: "pointer",
                  }}
                >
                  🟢 Entrada (Entrega de Chaves)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoVistoria("EXIT")}
                  style={{
                    flex: 1,
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: tipoVistoria === "EXIT" ? "2px solid var(--color-warning)" : "1px solid var(--color-outline-variant)",
                    backgroundColor: tipoVistoria === "EXIT" ? "var(--color-warning-container)" : "var(--color-surface-variant)",
                    color: tipoVistoria === "EXIT" ? "var(--color-warning)" : "var(--color-on-surface)",
                    fontWeight: "600",
                    fontSize: "var(--font-body-md)",
                    cursor: "pointer",
                  }}
                >
                  🟠 Saída (Término Locação)
                </button>
              </div>
            </div>

            {/* Data da Vistoria */}
            <div>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Data da Realização *
              </label>
              <input
                type="date"
                value={inspectedAt}
                onChange={(e) => setInspectedAt(e.target.value)}
                max={new Date().toLocaleDateString("en-CA")}
                required
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                }}
              />
            </div>

            {/* Referência do Laudo */}
            <div>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Referência / Laudo Técnico (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: LAUDO-SAIDA-2026/01"
                value={reportReference}
                onChange={(e) => setReportReference(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                }}
              />
            </div>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
              Descrição e Constatações do Imóvel *
            </label>
            <textarea
              rows={4}
              placeholder="Descreva detalhadamente o estado das paredes, pintura, pisos, hidráulica, elétrica, móveis e eventuais avarias ou conformidades observadas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-outline-variant)",
                fontSize: "var(--font-body-md)",
                fontFamily: "var(--font-family-base)",
              }}
            />
          </div>

          {/* Upload de Fotos e Vídeos */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
              Anexo de Evidências: Fotos e Vídeos
            </label>
            <p style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)", margin: "0 0 var(--space-2)" }}>
              Formatos aceitos: JPG, JPEG, PNG, WEBP (fotos) e MP4, MKV, WEBM (vídeos). As mídias originais são preservadas e copiadas com segurança.
            </p>

            <div
              style={{
                border: "2px dashed var(--color-outline-variant)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-5)",
                textAlign: "center",
                backgroundColor: "var(--color-primary-container)",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("file-input-vistoria").click()}
            >
              <UploadCloud size={36} color="var(--color-primary)" style={{ margin: "0 auto var(--space-2)" }} />
              <p style={{ fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface)", margin: "0 0 var(--space-1)" }}>
                Clique para selecionar fotos e vídeos do computador
              </p>
              <p style={{ fontSize: "var(--font-body-sm)", color: "var(--color-on-surface)", margin: 0 }}>
                Você pode selecionar múltiplos arquivos simultaneamente
              </p>
              <input
                id="file-input-vistoria"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/x-matroska,video/webm"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {/* Lista de Arquivos Selecionados */}
            {arquivosSelecionados.length > 0 && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <h4 style={{ fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface)", marginBottom: "var(--space-2)" }}>
                  Mídias a serem enviadas ({arquivosSelecionados.length}):
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
                  {arquivosSelecionados.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        border: "1px solid var(--color-outline-variant)",
                        borderRadius: "var(--radius-sm)",
                        padding: "var(--space-2)",
                        backgroundColor: "var(--color-surface)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-1)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirArquivo(idx);
                        }}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          backgroundColor: "var(--color-danger-action)",
                          color: "var(--color-on-danger-action)",
                          border: "none",
                          borderRadius: "var(--radius-full)",
                          width: "22px",
                          height: "22px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 2,
                        }}
                        title="Excluir anexo"
                      >
                        <X size={14} />
                      </button>

                      {item.type === "IMAGE" ? (
                        <img
                          src={item.preview}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "110px",
                            objectFit: "cover",
                            borderRadius: "var(--radius-xs)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "110px",
                            backgroundColor: "var(--color-primary)",
                            color: "var(--color-on-primary)",
                            borderRadius: "var(--radius-xs)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "var(--space-1)",
                          }}
                        >
                          <Video size={30} color="var(--color-info)" />
                          <span style={{ fontSize: "var(--font-body-sm)", fontWeight: "600" }}>VÍDEO</span>
                        </div>
                      )}

                      <div style={{ fontSize: "var(--font-body-sm)", color: "var(--color-on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "var(--font-body-sm)", color: "var(--color-on-surface)" }}>{item.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
            <button
              className="ui-action ui-action--primary ui-action--large"
              type="submit"
              disabled={salvando}
            >
              <ClipboardCheck size={20} />
              {salvando
                ? "Registrando e gravando evidências..."
                : tipoVistoria === "EXIT"
                ? "Concluir Vistoria de Saída"
                : "Concluir Vistoria de Entrada"}
            </button>
          </div>
        </form>
      )}

      {/* ABA 2: CONSULTAR VISTORIAS */}
      {abaAtiva === "consultar" && (
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-outline-variant)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-5)",
            boxShadow: "var(--elevation-1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--font-title-lg)", fontWeight: "bold", color: "var(--color-on-surface)", margin: 0 }}>
              Consultar Vistorias Registradas
            </h3>

            <div style={{ width: "350px" }}>
              <label style={{ display: "block", fontSize: "var(--font-body-md)", fontWeight: "600", color: "var(--color-on-surface-variant)", marginBottom: "var(--space-1)" }}>
                Filtrar por Imóvel:
              </label>
              <select
                value={filtroImovelId}
                onChange={(e) => setFiltroImovelId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                }}
              >
                <option value="">Selecione um imóvel para listar...</option>
                {imoveis.map((im) => (
                  <option key={im.id} value={im.id}>
                    {im.title || "Imóvel"} - {im.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!filtroImovelId ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-on-surface)" }}>
              <Building2 size={40} color="var(--color-primary)" style={{ margin: "0 auto var(--space-3)" }} />
              <p style={{ fontSize: "var(--font-body-md)", margin: 0 }}>
                Selecione um imóvel acima para carregar as vistorias de entrada e saída registradas.
              </p>
            </div>
          ) : carregandoLista ? (
            <p style={{ textAlign: "center", color: "var(--color-on-surface)", padding: "var(--space-4)" }}>
              Carregando vistorias...
            </p>
          ) : listaVistorias.length === 0 ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-on-surface)" }}>
              <p style={{ fontSize: "var(--font-body-md)", margin: "0 0 var(--space-2)" }}>
                Nenhuma vistoria registrada para este imóvel.
              </p>
              <button
                className="ui-action ui-action--primary"
                type="button"
                onClick={() => {
                  setImovelId(filtroImovelId);
                  setAbaAtiva("registrar");
                }}
              >
                Registrar Primeira Vistoria
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--font-body-md)" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--color-primary-container)", borderBottom: "2px solid var(--color-outline-variant)" }}>
                    <th style={{ padding: "var(--space-3)" }}>Tipo</th>
                    <th style={{ padding: "var(--space-3)" }}>Data</th>
                    <th style={{ padding: "var(--space-3)" }}>Laudo / Ref</th>
                    <th style={{ padding: "var(--space-3)" }}>Descrição</th>
                    <th style={{ padding: "var(--space-3)", textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listaVistorias.map((v) => {
                    const isExit = v.type === "EXIT";
                    const dataFormatada = new Date(v.inspectedAt).toLocaleDateString("pt-BR");
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
                        <td style={{ padding: "var(--space-3)" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "var(--space-1)",
                              padding: "var(--space-1) var(--space-2)",
                              borderRadius: "var(--radius-md)",
                              fontSize: "var(--font-body-sm)",
                              fontWeight: "bold",
                              backgroundColor: isExit ? "var(--color-warning-container)" : "var(--color-success-container)",
                              color: isExit ? "var(--color-primary)" : "var(--color-success)",
                            }}
                          >
                            {isExit ? "SAÍDA (EXIT)" : "ENTRADA (ENTRY)"}
                          </span>
                        </td>
                        <td style={{ padding: "var(--space-3)" }}>{dataFormatada}</td>
                        <td style={{ padding: "var(--space-3)" }}>{v.reportReference || "—"}</td>
                        <td style={{ padding: "var(--space-3)", maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.description}
                        </td>
                        <td style={{ padding: "var(--space-3)", textAlign: "center" }}>
                          <button
                            className="ui-action ui-action--neutral"
                            type="button"
                            onClick={() => abrirDetalhesVistoria(v.id)}
                          >
                            <Eye size={14} />
                            Ver Mídias e Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALHES E MÍDIAS */}
      {vistoriaDetalhe && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "var(--color-scrim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "var(--space-4)",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: "var(--radius-md)",
              width: "100%",
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "var(--space-5)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-body-sm)",
                    fontWeight: "bold",
                    marginBottom: "var(--space-1)",
                    backgroundColor: vistoriaDetalhe.type === "EXIT" ? "var(--color-warning-container)" : "var(--color-success-container)",
                    color: vistoriaDetalhe.type === "EXIT" ? "var(--color-primary)" : "var(--color-success)",
                  }}
                >
                  {vistoriaDetalhe.type === "EXIT" ? "Vistoria de Saída" : "Vistoria de Entrada"}
                </span>
                <h3 style={{ fontSize: "var(--font-title-lg)", fontWeight: "bold", margin: 0, color: "var(--color-on-surface)" }}>
                  Detalhes da Vistoria
                </h3>
              </div>
              <button
                className="ui-action ui-action--neutral"
                type="button"
                onClick={() => setVistoriaDetalhe(null)}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)", fontSize: "var(--font-body-md)" }}>
              <div>
                <strong>Data de Realização:</strong>{" "}
                {new Date(vistoriaDetalhe.inspectedAt).toLocaleDateString("pt-BR")}
              </div>
              <div>
                <strong>Laudo / Referência:</strong>{" "}
                {vistoriaDetalhe.reportReference || "Não informado"}
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <strong>Descrição:</strong>
                <p style={{ marginTop: "var(--space-1)", backgroundColor: "var(--color-primary-container)", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-outline-variant)" }}>
                  {vistoriaDetalhe.description}
                </p>
              </div>
            </div>

            <h4 style={{ fontSize: "var(--font-body-lg)", fontWeight: "bold", color: "var(--color-on-surface)", marginBottom: "var(--space-3)" }}>
              Mídias Anexadas ({vistoriaDetalhe.media?.length || 0})
            </h4>

            {(!vistoriaDetalhe.media || vistoriaDetalhe.media.length === 0) ? (
              <p style={{ color: "var(--color-on-surface)", fontSize: "var(--font-body-md)" }}>Nenhuma foto ou vídeo anexado a esta vistoria.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
                {vistoriaDetalhe.media.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      border: "1px solid var(--color-outline-variant)",
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      backgroundColor: "var(--color-primary-container)",
                    }}
                  >
                    {m.type === "IMAGE" ? (
                      <img
                        src={mediaFileUrl(m.filePath)}
                        alt={m.fileName}
                        style={{ width: "100%", height: "140px", objectFit: "cover", display: "block", cursor: "pointer" }}
                        onClick={() => window.open(mediaFileUrl(m.filePath), "_blank")}
                        title="Clique para visualizar em tela cheia"
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.parentElement) {
                            const fb = document.createElement("div");
                            fb.style.padding = "20px";
                            fb.style.fontSize = "12px";
                            fb.style.textAlign = "center";
                            fb.style.color = "var(--color-primary)";
                            fb.textContent = `Foto gravada no sistema: ${m.fileName}`;
                            e.target.parentElement.appendChild(fb);
                          }
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "140px",
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-on-primary)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <video
                          src={mediaFileUrl(m.filePath)}
                          controls
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <div style={{ padding: "var(--space-2) var(--space-2)", fontSize: "var(--font-body-sm)", color: "var(--color-on-surface)" }}>
                      <div
                        style={{ fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                        title={m.fileName}
                      >
                        {m.fileName}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-1)" }}>
                        <span>{(m.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <a
                          href={mediaFileUrl(m.filePath)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: "600", fontSize: "var(--font-body-sm)" }}
                        >
                          Visualizar
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "var(--space-5)", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="ui-action ui-action--neutral"
                type="button"
                onClick={() => setVistoriaDetalhe(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
