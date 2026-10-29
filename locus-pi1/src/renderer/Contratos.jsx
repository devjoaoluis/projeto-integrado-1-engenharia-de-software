import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileDown,
  ClipboardCheck,
} from "lucide-react";
import BotaoVoltar from "./components/BotaoVoltar";

export default function Contratos() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const imovelIdParam = searchParams.get("imovelId");

  const [abaAtiva, setAbaAtiva] = useState("gerar"); // "gerar" | "modelos"
  const [imoveis, setImoveis] = useState([]);
  const [locatarios, setLocatarios] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [modeloPadrao, setModeloPadrao] = useState("");

  const [imovelSelecionadoId, setImovelSelecionadoId] = useState("");
  const [locatarioSelecionadoId, setLocatarioSelecionadoId] = useState("");
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState("padrao");

  const [dadosMontados, setDadosMontados] = useState(null);
  const [conteudoContrato, setConteudoContrato] = useState("");
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Carrega listas iniciais
  useEffect(() => {
    async function carregarListas() {
      try {
        setMensagemErro("");
        const [listaImoveis, listaClientes, listaModelos, padrao] = await Promise.all([
          window.api.properties.list(),
          window.api.clients.list(),
          window.api.contractTemplates.list(),
          window.api.contracts.getDefaultTemplate(),
        ]);
        setImoveis(listaImoveis || []);
        setLocatarios((listaClientes || []).filter((c) => c.type === "TENANT"));
        setModelos(listaModelos || []);
        setModeloPadrao(padrao || "");

        // Se houver imovelId via query param, seleciona
        if (imovelIdParam) {
          setImovelSelecionadoId(imovelIdParam);
        } else if (listaImoveis && listaImoveis.length > 0) {
          // Pré-seleciona primeiro imóvel alugado ou disponível
          const preferencial = listaImoveis.find((i) => i.status === "ALUGADO") || listaImoveis[0];
          setImovelSelecionadoId(preferencial.id);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setMensagemErro("Erro ao carregar lista de imóveis ou clientes.");
      }
    }
    carregarListas();
  }, [imovelIdParam]);

  // Recarrega montagem do contrato sempre que mudar o imóvel, locatário ou modelo selecionado
  useEffect(() => {
    if (!imovelSelecionadoId) {
      setDadosMontados(null);
      setConteudoContrato("");
      return;
    }

    async function montarContrato() {
      setCarregandoDados(true);
      setMensagemErro("");
      setMensagemSucesso("");
      try {
        const payload = {
          propertyId: imovelSelecionadoId,
          tenantId: locatarioSelecionadoId || undefined,
          templateId: modeloSelecionadoId !== "padrao" ? modeloSelecionadoId : undefined,
          customTemplateContent: modeloSelecionadoId === "padrao" ? modeloPadrao : undefined,
        };
        const resultado = await window.api.contracts.assembleData(payload);
        setDadosMontados(resultado);
        setConteudoContrato(resultado.filledContent);

        // Se encontrou locatário associado e nenhum estava selecionado explicitamente, atualiza
        if (resultado.tenant && !locatarioSelecionadoId) {
          setLocatarioSelecionadoId(resultado.tenant.id);
        }
      } catch (err) {
        console.error("Erro ao montar dados do contrato:", err);
        setMensagemErro(err.message || "Não foi possível preencher os dados do contrato.");
      } finally {
        setCarregandoDados(false);
      }
    }

    montarContrato();
  }, [imovelSelecionadoId, locatarioSelecionadoId, modeloSelecionadoId, modeloPadrao]);

  // Exportar PDF
  async function exportarPdf() {
    if (!conteudoContrato.trim()) {
      setMensagemErro("O conteúdo do contrato está vazio.");
      return;
    }
    setExportandoPdf(true);
    setMensagemErro("");
    setMensagemSucesso("");

    try {
      const imovel = dadosMontados?.property;
      const locatario = dadosMontados?.tenant;
      const nomeBase = locatario
        ? `Contrato_${locatario.name.replace(/\s+/g, "_")}`
        : imovel
        ? `Contrato_${imovel.title.replace(/\s+/g, "_")}`
        : "Contrato_Locacao";

      const resultado = await window.api.contracts.exportPdf({
        content: conteudoContrato,
        title: "CONTRATO DE LOCAÇÃO RESIDENCIAL",
        defaultFileName: `${nomeBase}.pdf`,
      });

      if (resultado.success) {
        setMensagemSucesso(`Contrato gerado e salvo com sucesso em: ${resultado.filePath}`);
      } else if (resultado.canceled) {
        // Usuário cancelou a seleção do caminho
      }
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      setMensagemErro(err.message || "Erro ao exportar o documento PDF.");
    } finally {
      setExportandoPdf(false);
    }
  }

  const imovelAtual = imoveis.find((i) => i.id === imovelSelecionadoId);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
      <div style={{ marginBottom: "16px" }}>
        <BotaoVoltar fallbackTo="/home" />
      </div>

      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "bold", color: "#0f172a", marginBottom: "4px" }}>
          Contratos de Locação
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          Gere contratos em PDF automaticamente preenchidos com os dados do imóvel, proprietário e locatário.
        </p>
      </header>

      {/* Navegação por Abas */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2e8f0", marginBottom: "20px" }}>
        <button
          onClick={() => setAbaAtiva("gerar")}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: abaAtiva === "gerar" ? "3px solid #1877f2" : "3px solid transparent",
            color: abaAtiva === "gerar" ? "#1877f2" : "#64748b",
            fontWeight: abaAtiva === "gerar" ? "bold" : "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "15px",
          }}
        >
          <FileText size={18} />
          Gerar Contrato (Preenchimento Automático)
        </button>

        <button
          onClick={() => setAbaAtiva("modelos")}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: abaAtiva === "modelos" ? "3px solid #1877f2" : "3px solid transparent",
            color: abaAtiva === "modelos" ? "#1877f2" : "#64748b",
            fontWeight: abaAtiva === "modelos" ? "bold" : "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "15px",
          }}
        >
          <Plus size={18} />
          Modelos de Contrato ({modelos.length})
        </button>
      </div>

      {/* Alertas de Sucesso e Erro */}
      {mensagemSucesso && (
        <div
          role="status"
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <CheckCircle2 size={20} color="#10b981" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={20} color="#ef4444" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {abaAtiva === "gerar" && (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px" }}>
          {/* Painel Esquerdo: Seleção dos Parâmetros */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "16px" }}>
                1. Selecione o Imóvel
              </h2>

              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Imóvel:
              </label>
              <select
                value={imovelSelecionadoId}
                onChange={(e) => setImovelSelecionadoId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  marginBottom: "14px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <option value="">Selecione um imóvel...</option>
                {imoveis.map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {imovel.title} - {imovel.address} ({imovel.status})
                  </option>
                ))}
              </select>

              {dadosMontados?.property && (
                <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "6px", fontSize: "13px", color: "#334155" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", marginBottom: "4px" }}>
                    <Building2 size={16} color="#1877f2" />
                    {dadosMontados.property.title}
                  </div>
                  <div><strong>Endereço:</strong> {dadosMontados.property.address}</div>
                  <div><strong>Bairro:</strong> {dadosMontados.property.neighborhood || "Centro"}</div>
                  <div>
                    <strong>Valor:</strong>{" "}
                    {Number(dadosMontados.property.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                  {dadosMontados.owner && (
                    <div style={{ marginTop: "6px", borderTop: "1px dashed #cbd5e1", paddingTop: "6px" }}>
                      <strong>Proprietário:</strong> {dadosMontados.owner.name} ({dadosMontados.owner.cpfCnpj || "Sem CPF"})
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "16px" }}>
                2. Locatário Associado
              </h2>

              {dadosMontados?.rental ? (
                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: "#1e40af" }}>
                  ✓ Locação ativa identificada para este imóvel!
                </div>
              ) : null}

              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Locatário:
              </label>
              <select
                value={locatarioSelecionadoId}
                onChange={(e) => setLocatarioSelecionadoId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  marginBottom: "10px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <option value="">Selecione o locatário...</option>
                {locatarios.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.cpfCnpj ? `(${loc.cpfCnpj})` : ""}
                  </option>
                ))}
              </select>

              {dadosMontados?.tenant && (
                <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "6px", fontSize: "13px", color: "#334155" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", marginBottom: "4px" }}>
                    <User size={16} color="#1877f2" />
                    {dadosMontados.tenant.name}
                  </div>
                  <div><strong>CPF/CNPJ:</strong> {dadosMontados.tenant.cpfCnpj || "Não informado"}</div>
                  <div><strong>Telefone:</strong> {dadosMontados.tenant.phone || "Não informado"}</div>
                  <div><strong>E-mail:</strong> {dadosMontados.tenant.email || "Não informado"}</div>
                </div>
              )}
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "16px" }}>
                3. Modelo de Contrato
              </h2>

              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Selecione o Modelo:
              </label>
              <select
                value={modeloSelecionadoId}
                onChange={(e) => setModeloSelecionadoId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  marginBottom: "12px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <option value="padrao">Modelo Padrão de Locação Residencial</option>
                {modelos.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.name}
                  </option>
                ))}
              </select>

              {imovelSelecionadoId && (
                <div
                  style={{
                    marginTop: "16px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: "600", fontSize: "13px" }}>
                    <ClipboardCheck size={16} />
                    <span>Vistoria Obrigatória</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#15803d" }}>
                    Após assinar o contrato, realize a vistoria de entrada com fotos para liberar as chaves.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/vistorias?imovelId=${imovelSelecionadoId}&tipo=ENTRY`)}
                    style={{
                      marginTop: "4px",
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Ir para Vistoria de Entrada &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Painel Direito: Pré-visualização e Exportação */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a" }}>
                  Pré-visualização do Contrato Preenchido
                </h2>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  {carregandoDados ? "Atualizando campos..." : "Dados substituídos automaticamente. Você pode editar o texto antes de exportar."}
                </span>
              </div>

              <button
                type="button"
                onClick={exportarPdf}
                disabled={exportandoPdf || !conteudoContrato.trim()}
                style={{
                  padding: "12px 24px",
                  backgroundColor: exportandoPdf ? "#94a3b8" : "#1877f2",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: exportandoPdf ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 2px 4px rgba(24, 119, 242, 0.2)",
                  transition: "background 0.2s",
                }}
              >
                <FileDown size={20} />
                {exportandoPdf ? "Gerando PDF..." : "Exportar em PDF para Assinatura"}
              </button>
            </div>

            {/* Document Sheet Preview */}
            <div
              style={{
                flex: 1,
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                backgroundColor: "#f8fafc",
                padding: "20px",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <textarea
                value={conteudoContrato}
                onChange={(e) => setConteudoContrato(e.target.value)}
                placeholder="Selecione um imóvel e locatário para visualizar o contrato preenchido automaticamente..."
                style={{
                  width: "100%",
                  minHeight: "550px",
                  padding: "20px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#1e293b",
                  fontFamily: "Courier New, monospace",
                  resize: "vertical",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {abaAtiva === "modelos" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a" }}>
                Modelos de Contratos Cadastrados
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px" }}>
                Consulte os modelos disponíveis e selecione um modelo para gerar o contrato.
              </p>
            </div>

          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {/* Card do Modelo Padrão */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: "bold", color: "#0f172a" }}>Modelo Padrão de Locação Residencial</span>
                <span style={{ fontSize: "11px", backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "10px" }}>Sistema</span>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px", height: "36px", overflow: "hidden" }}>
                Contrato completo com cláusulas de vigência, encargos, deveres e assinaturas para locador, locatário e testemunhas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setModeloSelecionadoId("padrao");
                  setAbaAtiva("gerar");
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#1877f2",
                  cursor: "pointer",
                }}
              >
                Usar este modelo
              </button>
            </div>

            {/* Modelos salvos */}
            {modelos.map((mod) => (
              <div
                key={mod.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "16px",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "bold", color: "#0f172a" }}>{mod.name}</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {new Date(mod.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px", height: "36px", overflow: "hidden" }}>
                  {mod.content.slice(0, 100)}...
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModeloSelecionadoId(mod.id);
                    setAbaAtiva("gerar");
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#1877f2",
                    cursor: "pointer",
                  }}
                >
                  Usar este modelo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
