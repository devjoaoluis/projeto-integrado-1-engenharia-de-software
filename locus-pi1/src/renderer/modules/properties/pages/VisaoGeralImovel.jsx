import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adaptPropertyOverview } from "../domain/propertyOverview.mjs";
import Badge from "../../../shared/common/components/Badge";
import BotaoVoltar from "../../../shared/common/components/BotaoVoltar";

function VisaoGeralImovel() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [abaAtiva, setAbaAtiva] = useState("contratos");
  const [midiaAtiva, setMidiaAtiva] = useState(0);
  const [locatarios, setLocatarios] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);

  const [locacao, setLocacao] = useState({
    tenantId: "",
    monthlyRent: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    dueDay: "10",
  });

  const [salvandoLocacao, setSalvandoLocacao] = useState(false);
  const [erroLocacao, setErroLocacao] = useState("");
  const [sucessoLocacao, setSucessoLocacao] = useState("");
  const [desassociacaoPendente, setDesassociacaoPendente] = useState(false);

  // Estados da rescisão
  const [rescisaoAberta, setRescisaoAberta] = useState(false);
  const [resumoRescisao, setResumoRescisao] = useState(null);
  const [carregandoRescisao, setCarregandoRescisao] = useState(false);
  const [salvandoRescisao, setSalvandoRescisao] = useState(false);
  const [motivoRescisao, setMotivoRescisao] = useState("");
  const [aceitarDebitos, setAceitarDebitos] = useState(false);
  const [erroRescisao, setErroRescisao] = useState("");

  const [result, setResult] = useState({
    id: null,
    imovel: null,
    erro: "",
  });

  async function carregarOverview() {
    const overview = await window.api.properties.overview(id);

    const contracts = [
      ...overview.contracts.current,
      ...overview.contracts.previous,
      ...overview.contracts.scheduled,
    ];

    const tenantNames = Object.fromEntries(
      await Promise.all(
        [...new Set(contracts.map((contract) => contract.tenantId))]
          .map(async (tenantId) => {
            try {
              return [
                tenantId,
                (await window.api.clients.get(tenantId)).name,
              ];
            } catch {
              return [tenantId, "Locatário não encontrado"];
            }
          })
      )
    );

    const modelo = adaptPropertyOverview(overview, tenantNames);

    setResult({
      id,
      imovel: modelo,
      erro: "",
    });

    setMidiaAtiva(0);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (active) {
          await carregarOverview();
        }
      } catch {
        if (active) {
          setResult({
            id,
            imovel: null,
            erro: "Não foi possível carregar este imóvel. Ele pode ter sido removido.",
          });
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    window.api.clients.list()
      .then((clientes) => {
        if (active) {
          setLocatarios(
            (clientes || []).filter(
              (cliente) => cliente.type === "TENANT"
            )
          );
        }
      })
      .catch((error) =>
        console.error("Erro ao carregar locatários:", error)
      );

    window.api.owners.list()
      .then((lista) => {
        if (active) {
          setProprietarios(lista || []);
        }
      })
      .catch((error) =>
        console.error("Erro ao carregar proprietários:", error)
      );

    return () => {
      active = false;
    };
  }, []);

  if (result.id !== id) {
    return <p role="status">Carregando imóvel...</p>;
  }

  if (result.erro) {
    return (
      <div role="alert">
        <p>{result.erro}</p>
        <button onClick={() => navigate("/imoveis")}>
          Voltar para Imóveis
        </button>
      </div>
    );
  }

  const imovel = result.imovel;

  const contratoAssociado = imovel.contratos.find(
    (contrato) =>
      ["Vigente", "Agendado"].includes(contrato.status) &&
      contrato.rentalId
  );

  const historicoLocacoes = imovel.contratos.filter(
    (contrato) => contrato.status !== "Agendado"
  );

  const proprietarioAtual = proprietarios.find(
    (proprietario) => proprietario.id === imovel.ownerId
  );

  const valorFormatado = imovel.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function atualizarLocacao(event) {
    const { name, value } = event.target;

    setLocacao((atual) => ({
      ...atual,
      [name]: value,
    }));
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function associarLocatario(event) {
    event.preventDefault();

    setErroLocacao("");
    setSucessoLocacao("");
    setSalvandoLocacao(true);

    try {
      await window.api.rentals.create({
        propertyId: imovel.id,
        tenantId: locacao.tenantId,
        monthlyRent: imovel.valor,
        startDate: new Date(
          `${locacao.startDate}T00:00:00`
        ).getTime(),
        endDate: locacao.endDate
          ? new Date(`${locacao.endDate}T00:00:00`).getTime()
          : null,
        dueDay: Number(locacao.dueDay),
      });

      await carregarOverview();

      setSucessoLocacao(
        "Locatário associado com sucesso. O imóvel foi marcado como alugado."
      );

      setLocacao((atual) => ({
        ...atual,
        tenantId: "",
      }));
    } catch (error) {
      console.error("Erro ao associar locatário:", error);

      setErroLocacao(
        error.message || "Não foi possível associar o locatário."
      );
    } finally {
      setSalvandoLocacao(false);
    }
  }

  // DESASSOCIAÇÃO: mantém o comportamento existente
  async function desassociarLocatario() {
    if (!contratoAssociado) return;

    setDesassociacaoPendente(false);

    try {
      await window.api.rentals.cancel(
        contratoAssociado.rentalId
      );

      await carregarOverview();

      setSucessoLocacao("Imóvel disponível para alugar.");
    } catch (error) {
      setErroLocacao(
        error.message || "Não foi possível desassociar o locatário."
      );
    }
  }

  // ABRIR RESCISÃO E CONSULTAR RESUMO FINANCEIRO
  async function abrirRescisao() {
    if (!contratoAssociado?.rentalId) {
      setErroRescisao(
        "Não foi possível identificar a locação."
      );
      return;
    }

    setRescisaoAberta(true);
    setCarregandoRescisao(true);
    setResumoRescisao(null);
    setErroRescisao("");
    setMotivoRescisao("");
    setAceitarDebitos(false);

    try {
      const resumo =
        await window.api.rentals.getTerminationSummary(
          contratoAssociado.rentalId
        );

      setResumoRescisao(resumo);
    } catch (error) {
      console.error(
        "Erro ao consultar resumo da rescisão:",
        error
      );

      setErroRescisao(
        error.message ||
        "Não foi possível consultar os dados da rescisão."
      );
    } finally {
      setCarregandoRescisao(false);
    }
  }

  // CONFIRMAR RESCISÃO
  async function confirmarRescisao() {
    if (
      !contratoAssociado?.rentalId ||
      !resumoRescisao?.canTerminate
    ) {
      return;
    }

    if (
      resumoRescisao.hasPendingDebts &&
      !aceitarDebitos
    ) {
      setErroRescisao(
        "Confirme que está ciente dos débitos pendentes antes de continuar."
      );
      return;
    }

    setSalvandoRescisao(true);
    setErroRescisao("");

    try {
      await window.api.rentals.terminate({
        rentalId: contratoAssociado.rentalId,
        notes: motivoRescisao,
        hasDebts: resumoRescisao.hasPendingDebts,
        allowPendingDebts: aceitarDebitos,
      });

      setRescisaoAberta(false);
      setResumoRescisao(null);
      setMotivoRescisao("");
      setAceitarDebitos(false);

      setSucessoLocacao(
        "Contrato encerrado e imóvel liberado com sucesso!"
      );

      await carregarOverview();
    } catch (error) {
      console.error("Erro ao encerrar contrato:", error);

      setErroRescisao(
        error.message || "Não foi possível encerrar o contrato."
      );
    } finally {
      setSalvandoRescisao(false);
    }
  }

  return (
    <>
      <style>{`
        .visao-geral-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .voltar-btn {
          align-self: flex-start;
          background: none;
          border: none;
          color: var(--color-on-surface);
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .imovel-header-card {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--elevation-2);
          display: flex;
          gap: var(--space-5);
          overflow: hidden;
        }

        .imovel-header-img {
          width: 300px;
          height: 200px;
          object-fit: cover;
          background-color: var(--color-surface-variant);
        }

        .imovel-header-info {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: var(--space-3);
        }

        .galeria-imovel {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--elevation-2);
          padding: var(--space-4);
        }

        .galeria-imovel h3 {
          margin: 0 0 var(--space-4);
          color: var(--color-on-surface);
        }

        .galeria-visualizador {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-4);
        }

        .galeria-conteudo {
          width: min(720px, 100%);
          height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary-container);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .galeria-conteudo img,
        .galeria-conteudo video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .galeria-navegacao {
          width: 40px;
          height: 40px;
          border: none;
          border-radius: var(--radius-full);
          background: var(--color-primary);
          color: var(--color-on-primary);
          font-size: var(--font-title-lg);
          cursor: pointer;
        }

        .galeria-navegacao:disabled {
          background: var(--color-background);
          cursor: default;
        }

        .galeria-legenda {
          margin: var(--space-3) 0 0;
          text-align: center;
          color: var(--color-on-surface-variant);
          font-size: var(--font-body-md);
        }

        .associacao-locacao {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--elevation-2);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .associacao-locacao h3 {
          margin: 0 0 var(--space-1);
          color: var(--color-on-surface);
        }

        .form-locacao {
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr) auto;
          gap: var(--space-3);
          align-items: start;
          margin-top: 2px;
        }

        .form-locacao label {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          color: var(--color-on-surface-variant);
          font-size: var(--font-body-sm);
          font-weight: 600;
        }

        .form-locacao input,
        .form-locacao select {
          min-height: 40px;
          padding: 0 var(--space-2);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xs);
          background: var(--color-surface);
        }

        .form-locacao button {
          min-height: 40px;
          padding: 0 var(--space-3);
          border: none;
          border-radius: var(--radius-xs);
          background: var(--color-primary);
          color: var(--color-on-primary);
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }

        .botao-desassociar {
          align-self: flex-start;
          min-height: 40px;
          padding: 0 var(--space-3);
          border: none;
          border-radius: var(--radius-xs);
          background: var(--color-primary);
          color: var(--color-on-primary);
          cursor: pointer;
          font-weight: 600;
        }

        .form-locacao-valor {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          min-height: 40px;
          color: var(--color-on-surface);
          font-size: var(--font-body-sm);
        }

        .form-locacao-valor span {
          min-height: 40px;
          display: flex;
          align-items: center;
          color: var(--color-on-surface);
          font-size: var(--font-body-lg);
        }

        @media (max-width: 900px) {
          .form-locacao {
            grid-template-columns: repeat(2, 1fr);
          }

          .form-locacao > div:last-child {
            grid-column: span 2;
          }

          .form-locacao button {
            width: 100%;
          }
        }

        .imovel-titulo {
          font-size: var(--font-headline-sm);
          font-weight: bold;
          color: var(--color-on-surface);
          margin: 0;
        }

        .imovel-endereco {
          color: var(--color-on-surface-variant);
          font-size: var(--font-body-md);
          margin: 0;
        }

        .imovel-descricao {
          max-width: 720px;
          margin: 0;
          color: var(--color-on-surface);
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .imovel-detalhes {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3) var(--space-4);
          margin: 0;
          color: var(--color-on-surface);
          font-size: var(--font-body-md);
        }

        .locatario-atual {
          background: var(--color-success-container);
          border: 1px solid var(--color-success);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          color: var(--color-success);
          margin: 0;
        }

        .historico-locacao {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--elevation-2);
          padding: var(--space-4);
        }

        .historico-locacao h3 {
          margin: 0 0 var(--space-4);
          color: var(--color-on-surface);
        }

        .historico-locacao-lista {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .historico-locacao-item {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-sm);
          color: var(--color-on-surface);
          font-size: var(--font-body-md);
        }

        .associacao-locacao > p[role="alert"],
        .associacao-locacao > p[role="status"] {
          margin: 0;
        }

        .confirmacao-exclusao {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-scrim);
          z-index: 1000;
          padding: var(--space-4);
          overflow-y: auto;
        }

        .confirmacao-exclusao-conteudo {
          width: min(420px, calc(100vw - 32px));
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          padding: var(--space-5);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          box-shadow: var(--elevation-2);
          box-sizing: border-box;
        }

        .confirmacao-exclusao-acoes {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-2);
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .confirmacao-exclusao-acoes button {
          min-height: 38px;
          padding: 0 var(--space-3);
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .confirmacao-excluir {
          color: var(--color-on-primary);
          background: var(--color-error);
        }

        .imovel-tags {
          display: flex;
          gap: var(--space-2);
        }

        .abas-container {
          display: flex;
          border-bottom: 2px solid var(--color-outline-variant);
          gap: var(--space-4);
        }

        .aba-btn {
          padding: var(--space-3) var(--space-4);
          background: none;
          border: none;
          font-size: var(--font-body-md);
          font-weight: 600;
          color: var(--color-on-surface-variant);
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .aba-btn.ativa {
          color: var(--color-on-surface);
          border-bottom-color: var(--color-primary);
        }

        .aba-conteudo {
          background: var(--color-surface);
          padding: var(--space-5);
          border-radius: var(--radius-md);
          box-shadow: var(--elevation-2);
        }

        .tabela-custom {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .tabela-custom th,
        .tabela-custom td {
          padding: var(--space-3);
          border-bottom: 1px solid var(--color-outline-variant);
        }

        .tabela-custom th {
          color: var(--color-on-surface);
          font-size: var(--font-body-md);
        }

        .modal-rescisao-resumo p {
          margin: var(--space-2) 0;
        }

        .modal-rescisao-tabela {
          overflow-x: auto;
        }

        @media (max-width: 600px) {
          .imovel-header-card {
            flex-direction: column;
          }

          .imovel-header-img {
            width: 100%;
          }

          .historico-locacao-item {
            grid-template-columns: 1fr;
          }

          .confirmacao-exclusao-acoes {
            justify-content: stretch;
          }

          .confirmacao-exclusao-acoes button {
            flex: 1;
          }
        }
      `}</style>

      <div className="visao-geral-container">
        <BotaoVoltar
          destino="/imoveis"
          texto="Voltar para imóveis"
        />

        {/* CABEÇALHO DO IMÓVEL */}
        <div className="imovel-header-card">
          {imovel.foto ? (
            <img
              className="imovel-header-img"
              src={imovel.foto}
              alt={imovel.titulo}
            />
          ) : (
            <div
              className="imovel-header-img"
              aria-label="Imóvel sem foto"
            />
          )}

          <div className="imovel-header-info">
            <h2 className="imovel-titulo">
              {imovel.titulo}
            </h2>

            <p className="imovel-endereco">
              {imovel.endereco}
            </p>

            <p className="imovel-descricao">
              {imovel.descricao || "Nenhuma descrição cadastrada."}
            </p>

            <p className="imovel-descricao">
              <strong>Proprietário:</strong>{" "}
              {proprietarioAtual?.name ||
                "Nenhum proprietário associado"}
            </p>

            <p className="imovel-detalhes">
              <span>
                <strong>Quartos:</strong>{" "}
                {imovel.quartos ?? "Não informado"}
              </span>

              <span>
                <strong>Tipo:</strong>{" "}
                {imovel.tipo || "Não informado"}
              </span>
            </p>

            <div className="imovel-tags">
              <Badge
                texto={imovel.status}
                cor={
                  imovel.status === "Disponível"
                    ? "verde"
                    : "vermelho"
                }
              />

              <Badge texto={valorFormatado} />
            </div>
          </div>
        </div>

        {/* GALERIA */}
        <section
          className="galeria-imovel"
          aria-label="Fotos e vídeos do imóvel"
        >
          <h3>Fotos e vídeos</h3>

          {imovel.midias.length === 0 ? (
            <p>Nenhuma foto ou vídeo cadastrado.</p>
          ) : (
            <>
              <div className="galeria-visualizador">
                <button
                  className="galeria-navegacao"
                  type="button"
                  aria-label="Mídia anterior"
                  disabled={midiaAtiva === 0}
                  onClick={() =>
                    setMidiaAtiva((atual) =>
                      Math.max(0, atual - 1)
                    )
                  }
                >
                  ‹
                </button>

                <div className="galeria-conteudo">
                  {imovel.midias[midiaAtiva].tipo === "VIDEO" ? (
                    <video
                      controls
                      src={imovel.midias[midiaAtiva].url}
                    >
                      Seu navegador não suporta a reprodução de vídeo.
                    </video>
                  ) : (
                    <img
                      src={imovel.midias[midiaAtiva].url}
                      alt={
                        imovel.midias[midiaAtiva].nome ||
                        `Mídia ${midiaAtiva + 1} do imóvel`
                      }
                    />
                  )}
                </div>

                <button
                  className="galeria-navegacao"
                  type="button"
                  aria-label="Próxima mídia"
                  disabled={
                    midiaAtiva === imovel.midias.length - 1
                  }
                  onClick={() =>
                    setMidiaAtiva((atual) =>
                      Math.min(
                        imovel.midias.length - 1,
                        atual + 1
                      )
                    )
                  }
                >
                  ›
                </button>
              </div>

              <p className="galeria-legenda">
                {midiaAtiva + 1} de {imovel.midias.length}
              </p>
            </>
          )}
        </section>

        {/* ASSOCIAÇÃO DE LOCATÁRIO */}
        <section
          className="associacao-locacao"
          aria-label="Associar locatário"
        >
          <h3>Locatário</h3>

          {contratoAssociado && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-3)",
                background: "var(--color-primary-container)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-outline-variant)",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Locatário associado:</strong>{" "}
                {contratoAssociado.locatario}
              </p>

              {contratoAssociado.tenantId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/locatarios/${contratoAssociado.tenantId}`
                    )
                  }
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-on-primary)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-1) var(--space-3)",
                    fontSize: "var(--font-body-md)",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Ver Dossiê do Locatário
                </button>
              )}
            </div>
          )}

          <form
            className="form-locacao"
            onSubmit={associarLocatario}
          >
            <label className="ui-label ui-label-required">
              Locatário cadastrado

              <select
                name="tenantId"
                value={locacao.tenantId}
                onChange={atualizarLocacao}
                required
              >
                <option value="">Selecione</option>

                {locatarios.map((locatario) => (
                  <option
                    key={locatario.id}
                    value={locatario.id}
                  >
                    {locatario.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ui-label ui-label-required">
              Início

              <input
                name="startDate"
                type="date"
                value={locacao.startDate}
                onChange={atualizarLocacao}
                required
              />
            </label>

            <label className="ui-label ui-label-optional">
              Fim do contrato

              <input
                name="endDate"
                type="date"
                value={locacao.endDate}
                onChange={atualizarLocacao}
              />
            </label>

            <label className="ui-label ui-label-required">
              Dia de vencimento

              <input
                name="dueDay"
                type="number"
                min="1"
                max="31"
                value={locacao.dueDay}
                onChange={atualizarLocacao}
                required
              />
            </label>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: "var(--font-body-sm)",
                  fontWeight: 600,
                  visibility: "hidden",
                }}
              >
                Ação
              </span>

              <button
                type="submit"
                disabled={
                  salvandoLocacao ||
                  locatarios.length === 0 ||
                  Boolean(contratoAssociado)
                }
              >
                {contratoAssociado
                  ? "Locatário associado"
                  : salvandoLocacao
                    ? "Salvando..."
                    : "Associar"}
              </button>
            </div>
          </form>

          {locatarios.length === 0 && (
            <p>Nenhum cliente do tipo locatário foi cadastrado.</p>
          )}

          {erroLocacao && (
            <p role="alert">{erroLocacao}</p>
          )}

          {sucessoLocacao && (
            <p role="status">{sucessoLocacao}</p>
          )}

          {/* AÇÕES DO CONTRATO */}
          {contratoAssociado && (
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                flexWrap: "wrap",
                marginTop: "var(--space-2)",
              }}
            >
              <button
                type="button"
                className="botao-desassociar"
                onClick={() =>
                  setDesassociacaoPendente(true)
                }
              >
                Desassociar locatário
              </button>

              <button
                type="button"
                onClick={abrirRescisao}
                style={{
                  backgroundColor: "var(--color-error)",
                  color: "var(--color-on-error)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-4)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "var(--font-body-md)",
                }}
              >
                Encerrar contrato
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/vistorias?imovelId=${imovel.id}&tipo=ENTRY`
                  )
                }
                style={{
                  backgroundColor: "var(--color-success)",
                  color: "var(--color-on-success)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-4)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "var(--font-body-md)",
                }}
              >
                Vistoria de Entrada
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/vistorias?imovelId=${imovel.id}&tipo=EXIT`
                  )
                }
                style={{
                  backgroundColor: "var(--color-warning)",
                  color: "var(--color-on-warning)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-4)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "var(--font-body-md)",
                }}
              >
                Vistoria de Saída
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(`/contratos?imovelId=${imovel.id}`)
                }
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-on-primary)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-4)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "var(--font-body-md)",
                }}
              >
                Gerar Contrato em PDF
              </button>
            </div>
          )}
        </section>

        {/* ABAS */}
        <div className="abas-padrao">
          <button
            className={`aba-padrao ${
              abaAtiva === "contratos" ? "ativa" : ""
            }`}
            onClick={() => setAbaAtiva("contratos")}
          >
            Contratos ({imovel.contratos.length})
          </button>

          <button
            className={`aba-padrao ${
              abaAtiva === "pagamentos" ? "ativa" : ""
            }`}
            onClick={() => setAbaAtiva("pagamentos")}
          >
            Pagamentos ({imovel.pagamentos.length})
          </button>

          <button
            className={`aba-padrao ${
              abaAtiva === "vistorias" ? "ativa" : ""
            }`}
            onClick={() => setAbaAtiva("vistorias")}
          >
            Vistorias & Manutenções ({imovel.vistorias.length})
          </button>

          <button
            className={`aba-padrao ${
              abaAtiva === "historico" ? "ativa" : ""
            }`}
            onClick={() => setAbaAtiva("historico")}
          >
            Histórico ({historicoLocacoes.length})
          </button>
        </div>

        {/* MODAL DE DESASSOCIAÇÃO */}
        {desassociacaoPendente && (
          <div
            className="confirmacao-exclusao"
            role="dialog"
            aria-modal="true"
          >
            <div className="confirmacao-exclusao-conteudo">
              <h2>Desassociar locatário?</h2>

              <p>
                O imóvel ficará disponível novamente para uma nova locação.
              </p>

              <div
                style={{
                  backgroundColor: "var(--color-warning-container)",
                  border: "1px solid var(--color-warning)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--color-warning)",
                  fontSize: "var(--font-body-md)",
                }}
              >
                Esta ação desassocia o locatário atual e marca o imóvel como disponível.
              </div>

              <div className="confirmacao-exclusao-acoes">
                <button
                  type="button"
                  onClick={() => setDesassociacaoPendente(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="confirmacao-excluir"
                  onClick={desassociarLocatario}
                >
                  Confirmar desassociação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE RESCISÃO */}
        {rescisaoAberta && (
          <div
            className="confirmacao-exclusao"
            role="dialog"
            aria-modal="true"
          >
            <div className="confirmacao-exclusao-conteudo">
              <h2>Encerrar contrato</h2>

              {carregandoRescisao ? (
                <p>Consultando resumo financeiro da locação...</p>
              ) : (
                <div className="modal-rescisao-resumo">
                  {resumoRescisao && (
                    <>
                      <p>
                        <strong>Locatário:</strong>{" "}
                        {resumoRescisao.tenantName || contratoAssociado?.locatario}
                      </p>

                      <p>
                        <strong>Débitos pendentes:</strong>{" "}
                        {resumoRescisao.hasPendingDebts
                          ? formatarMoeda(resumoRescisao.pendingTotal)
                          : formatarMoeda(0)}
                      </p>

                      {Array.isArray(resumoRescisao.pendingDebts) &&
                        resumoRescisao.pendingDebts.length > 0 && (
                          <div className="modal-rescisao-tabela">
                            <table className="tabela-custom">
                              <thead>
                                <tr>
                                  <th>Referência</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {resumoRescisao.pendingDebts.map((debito, idx) => (
                                  <tr key={debito.id || idx}>
                                    <td>{debito.description || debito.reference || `Débito #${idx + 1}`}</td>
                                    <td>{formatarMoeda(debito.amount ?? debito.value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                      {resumoRescisao.hasPendingDebts && (
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            marginTop: "var(--space-3)",
                            fontSize: "var(--font-body-md)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={aceitarDebitos}
                            onChange={(e) => setAceitarDebitos(e.target.checked)}
                          />
                          Estou ciente dos débitos pendentes e desejo encerrar mesmo assim.
                        </label>
                      )}
                    </>
                  )}

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-1)",
                      marginTop: "var(--space-3)",
                      fontSize: "var(--font-body-md)",
                    }}
                  >
                    Motivo / Observações
                    <textarea
                      rows={3}
                      value={motivoRescisao}
                      onChange={(e) => setMotivoRescisao(e.target.value)}
                      placeholder="Informe o motivo do encerramento..."
                    />
                  </label>

                  {erroRescisao && (
                    <p
                      role="alert"
                      style={{ color: "var(--color-error)", marginTop: "var(--space-2)" }}
                    >
                      {erroRescisao}
                    </p>
                  )}
                </div>
              )}

              <div className="confirmacao-exclusao-acoes">
                <button
                  type="button"
                  disabled={salvandoRescisao}
                  onClick={() => setRescisaoAberta(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="confirmacao-excluir"
                  disabled={
                    salvandoRescisao ||
                    carregandoRescisao ||
                    !resumoRescisao?.canTerminate
                  }
                  onClick={confirmarRescisao}
                >
                  {salvandoRescisao ? "Encerrando..." : "Confirmar encerramento"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default VisaoGeralImovel;