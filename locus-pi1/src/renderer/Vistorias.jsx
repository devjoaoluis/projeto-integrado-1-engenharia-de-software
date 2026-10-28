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
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import BotaoVoltar from "./components/BotaoVoltar";

export default function Vistorias() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const imovelIdParam = searchParams.get("imovelId");
  const tipoParam = searchParams.get("tipo"); // "ENTRY" | "EXIT"

  const [abaAtiva, setAbaAtiva] = useState("registrar"); // "registrar" | "consultar"
  const [imoveis, setImoveis] = useState([]);
  const [carregandoImoveis, setCarregandoImoveis] = useState(true);

  // Form states
  const [imovelId, setImovelId] = useState(imovelIdParam || "");
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState("");
  const [tipoVistoria, setTipoVistoria] = useState(
    tipoParam === "EXIT" ? "EXIT" : "ENTRY"
  );
  const [inspectedAt, setInspectedAt] = useState(
    new Date().toISOString().split("T")[0]
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
        if (active && overview?.contratos) {
          // Filtrar contratos válidos (não cancelados)
          const validos = overview.contratos.filter(
            (c) => c.status !== "Cancelado"
          );
          setContratos(validos);
          if (validos.length > 0) {
            // Prioriza o contrato vigente ou o mais recente
            const vigente = validos.find((c) => c.status === "Vigente");
            setContratoId(vigente ? vigente.id : validos[0].id);
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
  }, [imovelId]);

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

  function removerArquivo(index) {
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

    const timestampData = new Date(`${inspectedAt}T12:00:00`).getTime();
    if (timestampData > Date.now()) {
      setMensagemErro("A data da vistoria não pode estar no futuro.");
      return;
    }

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
        contractId,
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
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
      <BotaoVoltar destino="/imoveis" texto="Voltar para Imóveis" />

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        <ShieldAlert size={26} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#166534", margin: "0 0 4px" }}>
            Módulo de Vistorias Obrigatórias (Regra de Negócio RN03)
          </h2>
          <p style={{ fontSize: "14px", color: "#15803d", margin: 0, lineHeight: 1.5 }}>
            A realização de vistorias com upload de fotos e vídeos é obrigatória em dois momentos cruciais:
            <br />
            <strong>1. Entrada do locatário:</strong> Obrigatória para liberação das chaves.
            <br />
            <strong>2. Saída do locatário:</strong> Obrigatória para encerramento formal do contrato e entrega do imóvel.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
        <button
          type="button"
          onClick={() => setAbaAtiva("registrar")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            fontSize: "15px",
            fontWeight: "600",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: abaAtiva === "registrar" ? "3px solid #1877f2" : "3px solid transparent",
            color: abaAtiva === "registrar" ? "#1877f2" : "#64748b",
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
            gap: "8px",
            padding: "12px 20px",
            fontSize: "15px",
            fontWeight: "600",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: abaAtiva === "consultar" ? "3px solid #1877f2" : "3px solid transparent",
            color: abaAtiva === "consultar" ? "#1877f2" : "#64748b",
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
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertCircle size={20} color="#dc2626" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* ABA 1: REGISTRAR VISTORIA */}
      {abaAtiva === "registrar" && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginTop: 0, marginBottom: "16px" }}>
            Dados da Vistoria
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Imovel */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Imóvel *
              </label>
              <select
                value={imovelId}
                onChange={(e) => setImovelId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
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
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Contrato Associado *
              </label>
              <select
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                required
                disabled={!imovelId || contratos.length === 0}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  backgroundColor: !imovelId || contratos.length === 0 ? "#f8fafc" : "#ffffff",
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
                    {c.reference || `CTR-${c.id.substring(0, 6)}`} | Locatário: {c.locatario} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Tipo de Vistoria (Momento RN03) */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Tipo de Vistoria (RN03) *
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setTipoVistoria("ENTRY")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "6px",
                    border: tipoVistoria === "ENTRY" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                    backgroundColor: tipoVistoria === "ENTRY" ? "#f0fdf4" : "#ffffff",
                    color: tipoVistoria === "ENTRY" ? "#166534" : "#475569",
                    fontWeight: "600",
                    fontSize: "14px",
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
                    padding: "10px",
                    borderRadius: "6px",
                    border: tipoVistoria === "EXIT" ? "2px solid #ea580c" : "1px solid #cbd5e1",
                    backgroundColor: tipoVistoria === "EXIT" ? "#fff7ed" : "#ffffff",
                    color: tipoVistoria === "EXIT" ? "#9a3412" : "#475569",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  🟠 Saída (Término Locação)
                </button>
              </div>
            </div>

            {/* Data da Vistoria */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Data da Realização *
              </label>
              <input
                type="date"
                value={inspectedAt}
                onChange={(e) => setInspectedAt(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Referência do Laudo */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Referência / Laudo Técnico (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: LAUDO-SAIDA-2026/01"
                value={reportReference}
                onChange={(e) => setReportReference(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
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
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Upload de Fotos e Vídeos */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
              Anexo de Evidências: Fotos e Vídeos
            </label>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 10px" }}>
              Formatos aceitos: JPG, JPEG, PNG, WEBP (fotos) e MP4, MKV, WEBM (vídeos). As mídias originais são preservadas e copiadas com segurança.
            </p>

            <div
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: "8px",
                padding: "24px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("file-input-vistoria").click()}
            >
              <UploadCloud size={36} color="#1877f2" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", margin: "0 0 4px" }}>
                Clique para selecionar fotos e vídeos do computador
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
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
              <div style={{ marginTop: "16px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
                  Mídias a serem enviadas ({arquivosSelecionados.length}):
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                  {arquivosSelecionados.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        padding: "8px",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removerArquivo(idx);
                        }}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          backgroundColor: "rgba(220, 38, 38, 0.9)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "50%",
                          width: "22px",
                          height: "22px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 2,
                        }}
                        title="Remover anexo"
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
                            borderRadius: "4px",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "110px",
                            backgroundColor: "#0f172a",
                            color: "#ffffff",
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <Video size={30} color="#38bdf8" />
                          <span style={{ fontSize: "11px", fontWeight: "600" }}>VÍDEO</span>
                        </div>
                      )}

                      <div style={{ fontSize: "12px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{item.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="submit"
              disabled={salvando}
              style={{
                backgroundColor: tipoVistoria === "EXIT" ? "#ea580c" : "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: salvando ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: salvando ? 0.7 : 1,
              }}
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
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>
              Consultar Vistorias Registradas
            </h3>

            <div style={{ width: "350px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                Filtrar por Imóvel:
              </label>
              <select
                value={filtroImovelId}
                onChange={(e) => setFiltroImovelId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
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
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <Building2 size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "15px", margin: 0 }}>
                Selecione um imóvel acima para carregar as vistorias de entrada e saída registradas.
              </p>
            </div>
          ) : carregandoLista ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
              Carregando vistorias...
            </p>
          ) : listaVistorias.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <p style={{ fontSize: "15px", margin: "0 0 10px" }}>
                Nenhuma vistoria registrada para este imóvel.
              </p>
              <button
                type="button"
                onClick={() => {
                  setImovelId(filtroImovelId);
                  setAbaAtiva("registrar");
                }}
                style={{
                  backgroundColor: "#1877f2",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Registrar Primeira Vistoria
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px" }}>Tipo</th>
                    <th style={{ padding: "12px" }}>Data</th>
                    <th style={{ padding: "12px" }}>Laudo / Ref</th>
                    <th style={{ padding: "12px" }}>Descrição</th>
                    <th style={{ padding: "12px", textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listaVistorias.map((v) => {
                    const isExit = v.type === "EXIT";
                    const dataFormatada = new Date(v.inspectedAt).toLocaleDateString("pt-BR");
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              backgroundColor: isExit ? "#ffedd5" : "#dcfce7",
                              color: isExit ? "#c2410c" : "#15803d",
                            }}
                          >
                            {isExit ? "SAÍDA (EXIT)" : "ENTRADA (ENTRY)"}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>{dataFormatada}</td>
                        <td style={{ padding: "12px" }}>{v.reportReference || "—"}</td>
                        <td style={{ padding: "12px", maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.description}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => abrirDetalhesVistoria(v.id)}
                            style={{
                              backgroundColor: "#f1f5f9",
                              color: "#1e293b",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "6px 12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
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
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    backgroundColor: vistoriaDetalhe.type === "EXIT" ? "#ffedd5" : "#dcfce7",
                    color: vistoriaDetalhe.type === "EXIT" ? "#c2410c" : "#15803d",
                  }}
                >
                  {vistoriaDetalhe.type === "EXIT" ? "Vistoria de Saída" : "Vistoria de Entrada"}
                </span>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#1e293b" }}>
                  Detalhes da Vistoria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVistoriaDetalhe(null)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "14px" }}>
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
                <p style={{ marginTop: "4px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  {vistoriaDetalhe.description}
                </p>
              </div>
            </div>

            <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px" }}>
              Mídias Anexadas ({vistoriaDetalhe.media?.length || 0})
            </h4>

            {(!vistoriaDetalhe.media || vistoriaDetalhe.media.length === 0) ? (
              <p style={{ color: "#64748b", fontSize: "14px" }}>Nenhuma foto ou vídeo anexado a esta vistoria.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                {vistoriaDetalhe.media.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      overflow: "hidden",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    {m.type === "IMAGE" ? (
                      <img
                        src={`file://${m.filePath}`}
                        alt={m.fileName}
                        style={{ width: "100%", height: "130px", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.innerHTML += `<div style="padding: 20px; font-size: 12px; text-align: center; color: #64748b;">Foto gravada no sistema: ${m.fileName}</div>`;
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "130px",
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <Video size={36} color="#38bdf8" />
                        <span style={{ fontSize: "12px", fontWeight: "600" }}>{m.fileName}</span>
                      </div>
                    )}
                    <div style={{ padding: "8px", fontSize: "12px", color: "#475569" }}>
                      <div style={{ fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {m.fileName}
                      </div>
                      <div>{(m.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setVistoriaDetalhe(null)}
                style={{
                  backgroundColor: "#1877f2",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 20px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
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
