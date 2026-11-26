
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  FileDown,
  ClipboardCheck,
} from "lucide-react";
import BotaoVoltar from "./components/BotaoVoltar";

function timestampParaInputDate(valor) {
  if (!valor) return "";
  try {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.slice(0, 10);
    }
    const d = new Date(Number(valor) || valor);
    if (Number.isNaN(d.getTime())) return "";
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  } catch {
    return "";
  }
}

function inputDateParaTimestamp(dataStr) {
  if (!dataStr) return undefined;
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  if (!ano || !mes || !dia) return undefined;
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0).getTime();
}

function formatarDataBr(dataStr) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-");
  if (!ano || !mes || !dia) return dataStr;
  return `${dia}/${mes}/${ano}`;
}

function textoParaNomeArquivo(valor) {
  return String(valor || "Documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function Contratos() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const imovelIdParam = searchParams.get("imovelId");

  const [abaAtiva, setAbaAtiva] = useState("gerar");
  const [imoveis, setImoveis] = useState([]);
  const [locatarios, setLocatarios] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [modeloPadrao, setModeloPadrao] = useState("");

  const [imovelSelecionadoId, setImovelSelecionadoId] = useState("");
  const [locatarioSelecionadoId, setLocatarioSelecionadoId] = useState("");
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState("padrao");

  // Campos editáveis de vigência (formato YYYY-MM-DD)
  const [dataInicioVigencia, setDataInicioVigencia] = useState("");
  const [dataFimVigencia, setDataFimVigencia] = useState("");

  const [dadosMontados, setDadosMontados] = useState(null);
  const [conteudoContrato, setConteudoContrato] = useState("");
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Modelo atualmente selecionado
  const modeloAtual = modelos.find(
    (modelo) => modelo.id === modeloSelecionadoId
  );

  const nomeModeloAtual =
    modeloSelecionadoId === "padrao"
      ? "Contrato de Locação Residencial Padrão"
      : modeloAtual?.name || "Documento";

  // Carrega listas iniciais
  useEffect(() => {
    async function carregarListas() {
      try {
        setMensagemErro("");

        const [
          listaImoveis,
          listaClientes,
          listaModelos,
          listaModelosBuiltin,
          padrao,
        ] = await Promise.all([
          window.api.properties.list(),
          window.api.clients.list(),
          window.api.contractTemplates.list(),
          window.api.contracts.getBuiltinTemplates(),
          window.api.contracts.getDefaultTemplate(),
        ]);

        setImoveis(listaImoveis || []);

        setLocatarios(
          (listaClientes || []).filter((c) => c.type === "TENANT")
        );

        // Combina os modelos cadastrados no banco com os modelos predefinidos.
        // O Map evita duplicações caso os modelos built-in já estejam na lista.
        const modelosUnicos = new Map();

        [...(listaModelos || []), ...(listaModelosBuiltin || [])].forEach(
          (modelo) => {
            if (modelo?.id) {
              modelosUnicos.set(modelo.id, modelo);
            }
          }
        );

        setModelos(Array.from(modelosUnicos.values()));
        setModeloPadrao(padrao || "");

        if (imovelIdParam) {
          setImovelSelecionadoId(imovelIdParam);
        } else if (listaImoveis && listaImoveis.length > 0) {
          const preferencial =
            listaImoveis.find((i) => i.status === "ALUGADO") ||
            listaImoveis[0];

          setImovelSelecionadoId(preferencial.id);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setMensagemErro("Erro ao carregar lista de imóveis, clientes ou modelos.");
      }
    }

    carregarListas();
  }, [imovelIdParam]);

  // Ao trocar de imóvel, limpa as datas anteriores para herdar as da nova locação (se houver)
  const handleTrocarImovel = (novoImovelId) => {
    setImovelSelecionadoId(novoImovelId);
    setDataInicioVigencia("");
    setDataFimVigencia("");
  };

  // Recarrega montagem do documento sempre que mudar imóvel, locatário, modelo ou datas
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
        const startTimestamp = inputDateParaTimestamp(dataInicioVigencia);
        const endTimestamp = inputDateParaTimestamp(dataFimVigencia);

        const payload = {
          propertyId: imovelSelecionadoId,
          tenantId: locatarioSelecionadoId || undefined,

          // Se for o modelo padrão, utiliza o conteúdo padrão.
          // Para os demais modelos, envia o ID correspondente.
          templateId:
            modeloSelecionadoId !== "padrao"
              ? modeloSelecionadoId
              : undefined,

          customTemplateContent:
            modeloSelecionadoId === "padrao"
              ? modeloPadrao
              : undefined,

          ...(startTimestamp
            ? {
                startDate: startTimestamp,
                dataInicio: dataInicioVigencia,
              }
            : {}),

          ...(endTimestamp
            ? {
                endDate: endTimestamp,
                dataFim: dataFimVigencia,
              }
            : {}),
        };

        const resultado = await window.api.contracts.assembleData(payload);

        setDadosMontados(resultado);

        // Preenche automaticamente as datas a partir da locação ativa
        // caso o usuário ainda não tenha editado.
        const rental = resultado?.rental;

        const inicioInicial =
          dataInicioVigencia ||
          timestampParaInputDate(
            rental?.startDate ?? rental?.dataInicio
          );

        const fimInicial =
          dataFimVigencia ||
          timestampParaInputDate(
            rental?.endDate ??
              rental?.terminationDate ??
              rental?.dataFim
          );

        if (!dataInicioVigencia && inicioInicial) {
          setDataInicioVigencia(inicioInicial);
        }

        if (!dataFimVigencia && fimInicial) {
          setDataFimVigencia(fimInicial);
        }

        // Substitui placeholders de vigência caso o template ainda os contenha.
        let textoFinal = resultado.filledContent || "";

        if (inicioInicial) {
          const inicioBr = formatarDataBr(inicioInicial);

          textoFinal = textoFinal.replace(
            /\{\{\s*(startDate|dataInicio|data_inicio|inicioVigencia)\s*\}\}/gi,
            inicioBr
          );
        }

        if (fimInicial) {
          const fimBr = formatarDataBr(fimInicial);

          textoFinal = textoFinal.replace(
            /\{\{\s*(endDate|dataFim|data_fim|fimVigencia|dataTermino)\s*\}\}/gi,
            fimBr
          );
        }

        setConteudoContrato(textoFinal);

        if (resultado.tenant && !locatarioSelecionadoId) {
          setLocatarioSelecionadoId(resultado.tenant.id);
        }
      } catch (err) {
        console.error("Erro ao montar dados do documento:", err);
        setMensagemErro(
          err.message || "Não foi possível preencher os dados do documento."
        );
      } finally {
        setCarregandoDados(false);
      }
    }

    montarContrato();
  }, [
    imovelSelecionadoId,
    locatarioSelecionadoId,
    modeloSelecionadoId,
    modeloPadrao,
    dataInicioVigencia,
    dataFimVigencia,
  ]);

  // Exportar PDF
  async function exportarPdf() {
    if (!conteudoContrato.trim()) {
      setMensagemErro("O conteúdo do documento está vazio.");
      return;
    }

    if (
      dataInicioVigencia &&
      dataFimVigencia &&
      dataFimVigencia <= dataInicioVigencia
    ) {
      setMensagemErro(
        "A Data de Fim deve ser posterior à Data de Início da vigência."
      );
      return;
    }

    setExportandoPdf(true);
    setMensagemErro("");
    setMensagemSucesso("");

    try {
      const imovel = dadosMontados?.property;
      const locatario = dadosMontados?.tenant;

      const identificador = locatario?.name || imovel?.title || "Documento";

      const nomeBase = `${textoParaNomeArquivo(
        nomeModeloAtual
      )}_${textoParaNomeArquivo(identificador)}`;

      const resultado = await window.api.contracts.exportPdf({
        content: conteudoContrato,
        title: nomeModeloAtual.toUpperCase(),
        defaultFileName: `${nomeBase}.pdf`,
        propertyId: imovelSelecionadoId || undefined,
        tenantId: locatarioSelecionadoId || undefined,
        rentalId: dadosMontados?.rental?.id || undefined,
        startDate: inputDateParaTimestamp(dataInicioVigencia),
        endDate: inputDateParaTimestamp(dataFimVigencia),
      });

      if (resultado.success) {
        setMensagemSucesso(
          `Documento gerado e salvo com sucesso em: ${resultado.filePath}`
        );
      }
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      setMensagemErro(
        err.message || "Erro ao exportar o documento PDF."
      );
    } finally {
      setExportandoPdf(false);
    }
  }

  const datasInvalidas = Boolean(
    dataInicioVigencia &&
      dataFimVigencia &&
      dataFimVigencia <= dataInicioVigencia
  );

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        paddingBottom: "40px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <BotaoVoltar fallbackTo="/home" />
      </div>

      <header style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "bold",
            color: "#0f172a",
            marginBottom: "4px",
          }}
        >
          Contratos de Locação
        </h1>

        <p style={{ color: "#64748b", fontSize: "14px" }}>
          Gere documentos em PDF automaticamente preenchidos com os dados
          disponíveis do imóvel, proprietário e locatário.
        </p>
      </header>

      {/* Navegação por Abas */}
      <div className="abas-padrao" style={{ marginBottom: "20px" }}>
        <button
          className={`aba-padrao ${abaAtiva === "gerar" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("gerar")}
        >
          <FileText size={18} />
          Gerar Documento (Preenchimento Automático)
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: "24px",
          }}
        >
          {/* Painel Esquerdo: Seleção dos Parâmetros */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* 1. Imóvel */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1e293b",
                  marginBottom: "16px",
                }}
              >
                1. Selecione o Imóvel
              </h2>

              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Imóvel:
              </label>

              <select
                value={imovelSelecionadoId}
                onChange={(e) => handleTrocarImovel(e.target.value)}
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
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#334155",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    <Building2 size={16} color="#1877f2" />
                    {dadosMontados.property.title}
                  </div>

                  <div>
                    <strong>Endereço:</strong>{" "}
                    {dadosMontados.property.address}
                  </div>

                  <div>
                    <strong>Bairro:</strong>{" "}
                    {dadosMontados.property.neighborhood || "Centro"}
                  </div>

                  <div>
                    <strong>Valor:</strong>{" "}
                    {Number(dadosMontados.property.price).toLocaleString(
                      "pt-BR",
                      {
                        style: "currency",
                        currency: "BRL",
                      }
                    )}
                  </div>

                  {dadosMontados.owner && (
                    <div
                      style={{
                        marginTop: "6px",
                        borderTop: "1px dashed #cbd5e1",
                        paddingTop: "6px",
                      }}
                    >
                      <strong>Proprietário:</strong>{" "}
                      {dadosMontados.owner.name} (
                      {dadosMontados.owner.cpfCnpj || "Sem CPF"})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Locatário */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1e293b",
                  marginBottom: "16px",
                }}
              >
                2. Locatário Associado
              </h2>

              {dadosMontados?.rental ? (
                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    padding: "10px",
                    borderRadius: "6px",
                    marginBottom: "12px",
                    fontSize: "13px",
                    color: "#1e40af",
                  }}
                >
                  ✓ Locação ativa identificada para este imóvel!
                </div>
              ) : null}

              <label className="ui-label ui-label-required">
                Locatário:
              </label>

              <select
                className="ui-control"
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
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#334155",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    <User size={16} color="#1877f2" />
                    {dadosMontados.tenant.name}
                  </div>

                  <div>
                    <strong>CPF/CNPJ:</strong>{" "}
                    {dadosMontados.tenant.cpfCnpj || "Não informado"}
                  </div>

                  <div>
                    <strong>Telefone:</strong>{" "}
                    {dadosMontados.tenant.phone || "Não informado"}
                  </div>

                  <div>
                    <strong>E-mail:</strong>{" "}
                    {dadosMontados.tenant.email || "Não informado"}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Vigência do Contrato */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                3. Vigência do Contrato
              </h2>

              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: 0,
                  marginBottom: "14px",
                }}
              >
                Ajuste as datas de início e término antes de exportar ou salvar
                o PDF.
              </p>

              <label
                htmlFor="contrato-data-inicio"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Data de Início:
              </label>

              <input
                id="contrato-data-inicio"
                type="date"
                value={dataInicioVigencia}
                onChange={(e) => setDataInicioVigencia(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  marginBottom: "12px",
                  backgroundColor: "#f8fafc",
                  boxSizing: "border-box",
                }}
              />

              <label
                htmlFor="contrato-data-fim"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Data de Fim:
              </label>

              <input
                id="contrato-data-fim"
                type="date"
                value={dataFimVigencia}
                min={dataInicioVigencia || undefined}
                onChange={(e) => setDataFimVigencia(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: datasInvalidas
                    ? "1px solid #ef4444"
                    : "1px solid #cbd5e1",
                  fontSize: "14px",
                  backgroundColor: "#f8fafc",
                  boxSizing: "border-box",
                }}
              />

              {datasInvalidas && (
                <p
                  style={{
                    marginTop: "8px",
                    marginBottom: 0,
                    fontSize: "12px",
                    color: "#dc2626",
                  }}
                >
                  A Data de Fim deve ser posterior à Data de Início.
                </p>
              )}
            </div>

            {/* 4. Modelo e Vistoria */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1e293b",
                  marginBottom: "16px",
                }}
              >
                4. Modelo de Contrato
              </h2>

              <label
                htmlFor="modelo-contrato"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Selecione o modelo:
              </label>

              <select
                id="modelo-contrato"
                value={modeloSelecionadoId}
                onChange={(e) => setModeloSelecionadoId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  backgroundColor: "#f8fafc",
                  boxSizing: "border-box",
                }}
              >
                <option value="padrao">
                  Modelo Padrão de Locação Residencial
                </option>

                {modelos
                  .filter((modelo) =>
                    modelo.id?.startsWith("builtin-")
                  )
                  .map((modelo) => (
                    <option key={modelo.id} value={modelo.id}>
                      {modelo.name}
                    </option>
                  ))}
              </select>

              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: "8px",
                  marginBottom: 0,
                }}
              >
                O documento selecionado será preenchido automaticamente com
                os dados disponíveis no sistema.
              </p>

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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#166534",
                      fontWeight: "600",
                      fontSize: "13px",
                    }}
                  >
                    <ClipboardCheck size={16} />
                    <span>Vistoria *</span>
                  </div>

                  {dadosMontados?.rental ? (
                    <>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "#15803d",
                        }}
                      >
                        Após assinar o contrato, realize a vistoria de entrada
                        com fotos para liberar as chaves.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/vistorias?imovelId=${imovelSelecionadoId}&tipo=ENTRY`
                          )
                        }
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
                    </>
                  ) : (
                    <>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "#15803d",
                        }}
                      >
                        O locatário ainda não foi associado formalmente a este
                        imóvel no sistema. Associe-o na tela do imóvel para que
                        o contrato fique ativo e habilitado para vistorias.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/imoveis/${imovelSelecionadoId}`)
                        }
                        style={{
                          marginTop: "4px",
                          backgroundColor: "#2563eb",
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
                        Ir para Imóvel e Associar Locatário &rarr;
                      </button>
                    </>
                  )}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#0f172a",
                  }}
                >
                  Pré-visualização do Documento Preenchido
                </h2>

                <span
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  {carregandoDados
                    ? "Atualizando campos..."
                    : "Dados substituídos automaticamente. Você pode editar o texto antes de exportar."}
                </span>
              </div>

              <button
                type="button"
                onClick={exportarPdf}
                disabled={
                  exportandoPdf ||
                  !conteudoContrato.trim() ||
                  datasInvalidas
                }
                style={{
                  padding: "12px 24px",
                  backgroundColor:
                    exportandoPdf || datasInvalidas
                      ? "#94a3b8"
                      : "#1877f2",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    exportandoPdf || datasInvalidas
                      ? "not-allowed"
                      : "pointer",
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

                {exportandoPdf
                  ? "Gerando PDF..."
                  : "Exportar em PDF para Assinatura"}
              </button>
            </div>

            {/* Pré-visualização do documento */}
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
                placeholder="Selecione um imóvel e locatário para visualizar o documento preenchido automaticamente..."
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
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
