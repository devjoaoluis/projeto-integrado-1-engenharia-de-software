
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
import BotaoVoltar from "../../../shared/common/components/BotaoVoltar";

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
        paddingBottom: "var(--space-6)",
      }}
    >
      <div style={{ marginBottom: "var(--space-4)" }}>
        <BotaoVoltar fallbackTo="/home" />
      </div>

      <header style={{ marginBottom: "var(--space-5)" }}>
        <h1
          style={{
            fontSize: "var(--font-headline-sm)",
            fontWeight: "bold",
            color: "var(--color-on-surface)",
            marginBottom: "var(--space-1)",
          }}
        >
          Contratos de Locação
        </h1>

        <p style={{ color: "var(--color-on-surface)", fontSize: "var(--font-body-md)" }}>
          Gere documentos em PDF automaticamente preenchidos com os dados
          disponíveis do imóvel, proprietário e locatário.
        </p>
      </header>

      {/* Navegação por Abas */}
      <div className="abas-padrao" style={{ marginBottom: "var(--space-4)" }}>
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
          <CheckCircle2 size={20} color="var(--color-success)" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
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
          <AlertCircle size={20} color="var(--color-error)" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {abaAtiva === "gerar" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: "var(--space-5)",
          }}
        >
          {/* Painel Esquerdo: Seleção dos Parâmetros */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {/* 1. Imóvel */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                boxShadow: "var(--elevation-1)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-body-lg)",
                  fontWeight: "bold",
                  color: "var(--color-on-surface)",
                  marginBottom: "var(--space-4)",
                }}
              >
                1. Selecione o Imóvel
              </h2>

              <label
                style={{
                  display: "block",
                  fontSize: "var(--font-body-md)",
                  fontWeight: "600",
                  color: "var(--color-on-surface-variant)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Imóvel:
              </label>

              <select
                value={imovelSelecionadoId}
                onChange={(e) => handleTrocarImovel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                  marginBottom: "var(--space-3)",
                  backgroundColor: "var(--color-primary-container)",
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
                    backgroundColor: "var(--color-primary-container)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-body-md)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      fontWeight: "bold",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    <Building2 size={16} color="var(--color-primary)" />
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
                        marginTop: "var(--space-1)",
                        borderTop: "1px dashed var(--color-outline-variant)",
                        paddingTop: "var(--space-1)",
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
                background: "var(--color-surface)",
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                boxShadow: "var(--elevation-1)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-body-lg)",
                  fontWeight: "bold",
                  color: "var(--color-on-surface)",
                  marginBottom: "var(--space-4)",
                }}
              >
                2. Locatário Associado
              </h2>

              {dadosMontados?.rental ? (
                <div
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                    border: "1px solid var(--color-outline-variant)",
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "var(--space-3)",
                    fontSize: "var(--font-body-md)",
                    color: "var(--color-on-surface)",
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
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                  marginBottom: "var(--space-2)",
                  backgroundColor: "var(--color-primary-container)",
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
                    backgroundColor: "var(--color-primary-container)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-body-md)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      fontWeight: "bold",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    <User size={16} color="var(--color-primary)" />
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
                background: "var(--color-surface)",
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                boxShadow: "var(--elevation-1)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-body-lg)",
                  fontWeight: "bold",
                  color: "var(--color-on-surface)",
                  marginBottom: "var(--space-1)",
                }}
              >
                3. Vigência do Contrato
              </h2>

              <p
                style={{
                  fontSize: "var(--font-body-sm)",
                  color: "var(--color-on-surface)",
                  marginTop: 0,
                  marginBottom: "var(--space-3)",
                }}
              >
                Ajuste as datas de início e término antes de exportar ou salvar
                o PDF.
              </p>

              <label
                htmlFor="contrato-data-inicio"
                style={{
                  display: "block",
                  fontSize: "var(--font-body-md)",
                  fontWeight: "600",
                  color: "var(--color-on-surface-variant)",
                  marginBottom: "var(--space-1)",
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
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                  marginBottom: "var(--space-3)",
                  backgroundColor: "var(--color-primary-container)",
                  boxSizing: "border-box",
                }}
              />

              <label
                htmlFor="contrato-data-fim"
                style={{
                  display: "block",
                  fontSize: "var(--font-body-md)",
                  fontWeight: "600",
                  color: "var(--color-on-surface-variant)",
                  marginBottom: "var(--space-1)",
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
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  border: datasInvalidas
                    ? "1px solid var(--color-error)"
                    : "1px solid var(--color-primary)",
                  fontSize: "var(--font-body-md)",
                  backgroundColor: "var(--color-primary-container)",
                  boxSizing: "border-box",
                }}
              />

              {datasInvalidas && (
                <p
                  style={{
                    marginTop: "var(--space-2)",
                    marginBottom: 0,
                    fontSize: "var(--font-body-sm)",
                    color: "var(--color-error)",
                  }}
                >
                  A Data de Fim deve ser posterior à Data de Início.
                </p>
              )}
            </div>

            {/* 4. Modelo e Vistoria */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                boxShadow: "var(--elevation-1)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-body-lg)",
                  fontWeight: "bold",
                  color: "var(--color-on-surface)",
                  marginBottom: "var(--space-4)",
                }}
              >
                4. Modelo de Contrato
              </h2>

              <label
                htmlFor="modelo-contrato"
                style={{
                  display: "block",
                  fontSize: "var(--font-body-md)",
                  fontWeight: "600",
                  color: "var(--color-on-surface-variant)",
                  marginBottom: "var(--space-1)",
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
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  fontSize: "var(--font-body-md)",
                  backgroundColor: "var(--color-primary-container)",
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
                  fontSize: "var(--font-body-sm)",
                  color: "var(--color-on-surface)",
                  marginTop: "var(--space-2)",
                  marginBottom: 0,
                }}
              >
                O documento selecionado será preenchido automaticamente com
                os dados disponíveis no sistema.
              </p>

              {imovelSelecionadoId && (
                <div
                  style={{
                    marginTop: "var(--space-4)",
                    backgroundColor: "var(--color-success-container)",
                    border: "1px solid var(--color-success)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-3) var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      color: "var(--color-success)",
                      fontWeight: "600",
                      fontSize: "var(--font-body-md)",
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
                          fontSize: "var(--font-body-sm)",
                          color: "var(--color-success)",
                        }}
                      >
                        Após assinar o contrato, realize a vistoria de entrada
                        com fotos para liberar as chaves.
                      </p>

                      <button
                        className="ui-action ui-action--positive"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/vistorias?imovelId=${imovelSelecionadoId}&tipo=ENTRY`
                          )
                        }
                        style={{ marginTop: "var(--space-1)" }}
                      >
                        Ir para Vistoria de Entrada &rarr;
                      </button>
                    </>
                  ) : (
                    <>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-body-sm)",
                          color: "var(--color-success)",
                        }}
                      >
                        O locatário ainda não foi associado formalmente a este
                        imóvel no sistema. Associe-o na tela do imóvel para que
                        o contrato fique ativo e habilitado para vistorias.
                      </p>

                      <button
                        className="ui-action ui-action--primary"
                        type="button"
                        onClick={() =>
                          navigate(`/imoveis/${imovelSelecionadoId}`)
                        }
                        style={{ marginTop: "var(--space-1)" }}
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
              background: "var(--color-surface)",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-5)",
              boxShadow: "var(--elevation-1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-4)",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "var(--font-title-lg)",
                    fontWeight: "bold",
                    color: "var(--color-on-surface)",
                  }}
                >
                  Pré-visualização do Documento Preenchido
                </h2>

                <span
                  style={{
                    fontSize: "var(--font-body-md)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {carregandoDados
                    ? "Atualizando campos..."
                    : "Dados substituídos automaticamente. Você pode editar o texto antes de exportar."}
                </span>
              </div>

              <button
                className="ui-action ui-action--primary ui-action--large"
                type="button"
                onClick={exportarPdf}
                disabled={
                  exportandoPdf ||
                  !conteudoContrato.trim() ||
                  datasInvalidas
                }
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
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--color-surface)",
                padding: "var(--space-4)",
                boxShadow: "var(--elevation-1)",
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
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-outline-variant)",
                  backgroundColor: "var(--color-surface)",
                  fontSize: "var(--font-body-md)",
                  lineHeight: "1.6",
                  color: "var(--color-on-surface)",
                  fontFamily: "var(--font-family-base)",
                  resize: "vertical",
                  boxShadow: "var(--elevation-1)",
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
