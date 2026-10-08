import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adaptPropertyOverview } from "./propertyOverview.mjs";
import Badge from "./components/Badge";

function VisaoGeralImovel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState("contratos");
  const [midiaAtiva, setMidiaAtiva] = useState(0);
  const [locatarios, setLocatarios] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [proprietarioId, setProprietarioId] = useState("");
  const [salvandoProprietario, setSalvandoProprietario] = useState(false);
  const [erroProprietario, setErroProprietario] = useState("");
  const [locacao, setLocacao] = useState({
    tenantId: "",
    monthlyRent: "",
    startDate: new Date().toISOString().slice(0, 10),
    dueDay: "10",
  });
  const [salvandoLocacao, setSalvandoLocacao] = useState(false);
  const [erroLocacao, setErroLocacao] = useState("");
  const [sucessoLocacao, setSucessoLocacao] = useState("");
  const [confirmarDesassociacao, setConfirmarDesassociacao] = useState(false);

  const [result, setResult] = useState({ id: null, imovel: null, erro: "" });

  async function carregarOverview() {
    const overview = await window.api.properties.overview(id);
    const contracts = [...overview.contracts.current, ...overview.contracts.previous, ...overview.contracts.scheduled];
    const tenantNames = Object.fromEntries(await Promise.all(
      [...new Set(contracts.map(contract => contract.tenantId))].map(async tenantId => {
        try { return [tenantId, (await window.api.clients.get(tenantId)).name]; }
        catch { return [tenantId, "Locatário não encontrado"]; }
      })
    ));
    const modelo = adaptPropertyOverview(overview, tenantNames);
    setProprietarioId(modelo.ownerId || "");
    setResult({ id, imovel: modelo, erro: "" });
    setMidiaAtiva(0);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (active) await carregarOverview();
      } catch {
        if (active) setResult({ id, imovel: null, erro: "Não foi possível carregar este imóvel. Ele pode ter sido removido." });
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    window.api.clients.list()
      .then((clientes) => {
        if (active) setLocatarios((clientes || []).filter((cliente) => cliente.type === "TENANT"));
      })
      .catch((error) => console.error("Erro ao carregar locatários:", error));
    window.api.owners.list()
      .then((lista) => { if (active) setProprietarios(lista || []); })
      .catch((error) => console.error("Erro ao carregar proprietários:", error));
    return () => { active = false; };
  }, []);

  if (result.id !== id) return <p role="status">Carregando imóvel...</p>;
  if (result.erro) return <div role="alert"><p>{result.erro}</p><button onClick={() => navigate("/imoveis")}>Voltar para Imóveis</button></div>;
  const imovel = result.imovel;
  const contratoAssociado = imovel.contratos.find((contrato) => ["Vigente", "Agendado"].includes(contrato.status) && contrato.rentalId);
  const proprietarioAtual = proprietarios.find((proprietario) => proprietario.id === imovel.ownerId);

  const valorFormatado = imovel.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function atualizarLocacao(event) {
    const { name, value } = event.target;
    setLocacao((atual) => ({ ...atual, [name]: value }));
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
        startDate: new Date(`${locacao.startDate}T00:00:00`).getTime(),
        dueDay: Number(locacao.dueDay),
      });
      await carregarOverview();
      setSucessoLocacao("Locatário associado com sucesso. O imóvel foi marcado como alugado.");
      setLocacao((atual) => ({ ...atual, tenantId: "" }));
    } catch (error) {
      console.error("Erro ao associar locatário:", error);
      setErroLocacao(error.message || "Não foi possível associar o locatário.");
    } finally {
      setSalvandoLocacao(false);
    }
  }

  async function salvarProprietario(event) {
    event.preventDefault();
    setErroProprietario("");
    setSalvandoProprietario(true);
    try {
      await window.api.properties.update(imovel.id, { ownerId: proprietarioId || null });
      await carregarOverview();
    } catch (error) {
      console.error("Erro ao associar proprietário:", error);
      setErroProprietario(error.message || "Não foi possível associar o proprietário.");
    } finally {
      setSalvandoProprietario(false);
    }
  }

  async function desassociarLocatario() {
    if (!contratoAssociado) return;
    setConfirmarDesassociacao(false);
    try {
      await window.api.rentals.cancel(contratoAssociado.rentalId);
      await carregarOverview();
      setSucessoLocacao("Locatário desassociado com sucesso.");
    } catch (error) {
      setErroLocacao(error.message || "Não foi possível desassociar o locatário.");
    }
  }

  return (
    <>
      <style>{`
        .visao-geral-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .voltar-btn {
          align-self: flex-start;
          background: none;
          border: none;
          color: #1976d2;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .imovel-header-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          gap: 24px;
          overflow: hidden;
        }

        .imovel-header-img {
          width: 300px;
          height: 200px;
          object-fit: cover;
          background-color: #e0e0e0;
        }

        .imovel-header-info {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
        }

        .galeria-imovel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          padding: 20px;
        }

        .galeria-imovel h3 {
          margin: 0 0 16px;
          color: #1976d2;
        }

        .galeria-visualizador {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .galeria-conteudo {
          width: min(720px, 100%);
          height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f3f5;
          border-radius: 8px;
          overflow: hidden;
        }

        .galeria-conteudo img, .galeria-conteudo video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .galeria-navegacao {
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 50%;
          background: #1976d2;
          color: white;
          font-size: 22px;
          cursor: pointer;
        }

        .galeria-navegacao:disabled {
          background: #c8cdd2;
          cursor: default;
        }

        .galeria-legenda {
          margin: 12px 0 0;
          text-align: center;
          color: #666;
          font-size: 13px;
        }

        .associacao-locacao {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .associacao-locacao h3 {
          margin: 0 0 2px;
          color: #1976d2;
        }

        .form-locacao {
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr) auto;
          gap: 12px;
          align-items: end;
          margin-top: 2px;
        }

        .form-locacao label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #555;
          font-size: 12px;
          font-weight: 600;
        }

        .form-locacao input, .form-locacao select {
          min-height: 40px;
          padding: 0 10px;
          border: 1px solid #c8cdd2;
          border-radius: 4px;
          background: white;
        }

        .form-locacao button {
          min-height: 40px;
          padding: 0 14px;
          border: none;
          border-radius: 4px;
          background: #1976d2;
          color: white;
          cursor: pointer;
          font-weight: 600;
        }

        .form-locacao-valor {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 40px;
          color: #555;
          font-size: 12px;
        }

        .form-locacao-valor span {
          min-height: 40px;
          display: flex;
          align-items: center;
          color: #1976d2;
          font-size: 16px;
        }

        @media (max-width: 900px) {
          .form-locacao {
            grid-template-columns: repeat(2, 1fr);
          }
          .form-locacao button {
            grid-column: span 2;
          }
        }

        .imovel-titulo {
          font-size: 24px;
          font-weight: bold;
          color: #1976d2;
          margin: 0;
        }

        .imovel-endereco {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .imovel-descricao {
          max-width: 720px;
          margin: 0;
          color: #444;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .imovel-detalhes {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          margin: 0;
          color: #555;
          font-size: 14px;
        }

        .locatario-atual {
          background: #eef8f1;
          border: 1px solid #b7dfc1;
          border-radius: 8px;
          padding: 12px;
          color: #245b32;
          margin: 0;
        }

        .proprietario-atual {
          background: #eef8f1;
          border: 1px solid #b7dfc1;
          border-radius: 8px;
          padding: 12px;
          color: #245b32;
          margin: 0;
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
            background: rgba(0, 0, 0, .35);
            z-index: 10;
        }

        .confirmacao-exclusao-conteudo {
            width: min(420px, calc(100vw - 32px));
            padding: 24px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 8px 28px rgba(0, 0, 0, .2);
        }

        .confirmacao-exclusao-acoes {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 20px;
        }

        .confirmacao-exclusao-acoes button {
            min-height: 38px;
            padding: 0 14px;
            border: 0;
            border-radius: 4px;
            cursor: pointer;
        }

        .confirmacao-excluir {
            color: white;
            background: #d32f2f;
        }

        .imovel-tags {
          display: flex;
          gap: 8px;
        }

        /* NAVEGAÇÃO POR ABAS */
        .abas-container {
          display: flex;
          border-bottom: 2px solid #e0e0e0;
          gap: 16px;
        }

        .aba-btn {
          padding: 12px 16px;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .aba-btn.ativa {
          color: #1976d2;
          border-bottom-color: #1976d2;
        }


        .aba-conteudo {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .tabela-custom {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .tabela-custom th, .tabela-custom td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .tabela-custom th {
          color: #444;
          font-size: 14px;
        }
      `}</style>

      <div className="visao-geral-container">
        <button className="voltar-btn" onClick={() => navigate("/imoveis")}>
          ← Voltar para Imóveis
        </button>


        <div className="imovel-header-card">
          {imovel.foto ? <img className="imovel-header-img" src={imovel.foto} alt={imovel.titulo} /> : <div className="imovel-header-img" aria-label="Imóvel sem foto" />}
          <div className="imovel-header-info">
            <h2 className="imovel-titulo">{imovel.titulo}</h2>
            <p className="imovel-endereco">{imovel.endereco}</p>
            <p className="imovel-descricao">{imovel.descricao || "Nenhuma descrição cadastrada."}</p>
            <p className="imovel-detalhes">
              <span><strong>Quartos:</strong> {imovel.quartos ?? "Não informado"}</span>
              <span><strong>Tipo:</strong> {imovel.tipo || "Não informado"}</span>
            </p>

            <div className="imovel-tags">
              <Badge texto={imovel.status} cor={imovel.status === "Disponível" ? "verde" : "vermelho"} />
              <Badge texto={valorFormatado} />
            </div>
          </div>
        </div>

        <section className="galeria-imovel" aria-label="Fotos e vídeos do imóvel">
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
                  onClick={() => setMidiaAtiva((atual) => Math.max(0, atual - 1))}
                >
                  ‹
                </button>
                <div className="galeria-conteudo">
                  {imovel.midias[midiaAtiva].tipo === "VIDEO" ? (
                    <video controls src={imovel.midias[midiaAtiva].url}>
                      Seu navegador não suporta a reprodução de vídeo.
                    </video>
                  ) : (
                    <img
                      src={imovel.midias[midiaAtiva].url}
                      alt={imovel.midias[midiaAtiva].nome || `Mídia ${midiaAtiva + 1} do imóvel`}
                    />
                  )}
                </div>
                <button
                  className="galeria-navegacao"
                  type="button"
                  aria-label="Próxima mídia"
                  disabled={midiaAtiva === imovel.midias.length - 1}
                  onClick={() => setMidiaAtiva((atual) => Math.min(imovel.midias.length - 1, atual + 1))}
                >
                  ›
                </button>
              </div>
              <p className="galeria-legenda">
                {midiaAtiva + 1} de {imovel.midias.length}
                {imovel.midias[midiaAtiva].nome ? ` — ${imovel.midias[midiaAtiva].nome}` : ""}
              </p>
            </>
          )}
        </section>

        <section className="associacao-locacao" aria-label="Associar locatário">
          <h3>Associar locatário</h3>
          {contratoAssociado && (
            <p className="locatario-atual">
              <strong>Locatário associado:</strong> {contratoAssociado.locatario}
            </p>
          )}
          <form className="form-locacao" onSubmit={associarLocatario}>
            <label>
              Locatário cadastrado
              <select name="tenantId" value={locacao.tenantId} onChange={atualizarLocacao} required>
                <option value="">Selecione</option>
                {locatarios.map((locatario) => (
                  <option key={locatario.id} value={locatario.id}>{locatario.name}</option>
                ))}
              </select>
            </label>
            <div className="form-locacao-valor">
              <strong>Valor do aluguel</strong>
              <span>{valorFormatado}</span>
            </div>
            <label>
              Início
              <input name="startDate" type="date" value={locacao.startDate} onChange={atualizarLocacao} required />
            </label>
            <label>
              Dia de vencimento
              <input name="dueDay" type="number" min="1" max="31" value={locacao.dueDay} onChange={atualizarLocacao} required />
            </label>
            <button type="submit" disabled={salvandoLocacao || locatarios.length === 0 || Boolean(contratoAssociado)}>
              {contratoAssociado ? "Locatário associado" : salvandoLocacao ? "Salvando..." : "Associar"}
            </button>
          </form>
          {locatarios.length === 0 && <p>Nenhum cliente do tipo locatário foi cadastrado.</p>}
          {erroLocacao && <p role="alert">{erroLocacao}</p>}
          {sucessoLocacao && <p role="status">{sucessoLocacao}</p>}
          {contratoAssociado && (
            <button type="button" className="voltar-btn" onClick={() => setConfirmarDesassociacao(true)}>
              Desassociar locatário
            </button>
          )}
        </section>

        <section className="associacao-locacao" aria-label="Associar proprietário">
          <h3>Associar proprietário</h3>
          <p className="proprietario-atual">
            <strong>Proprietário atual:</strong> {proprietarioAtual?.name || "Nenhum proprietário associado"}
          </p>
          <form className="form-locacao" onSubmit={salvarProprietario}>
            <label>
              Proprietário cadastrado
              <select value={proprietarioId} onChange={(event) => setProprietarioId(event.target.value)}>
                <option value="">Nenhum proprietário</option>
                {proprietarios.map((proprietario) => (
                  <option key={proprietario.id} value={proprietario.id}>{proprietario.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={salvandoProprietario}>
              {salvandoProprietario ? "Salvando..." : "Salvar proprietário"}
            </button>
          </form>
          {erroProprietario && <p role="alert">{erroProprietario}</p>}
        </section>


        <div className="abas-container">
          <button
            className={`aba-btn ${abaAtiva === "contratos" ? "ativa" : ""}`}
            onClick={() => setAbaAtiva("contratos")}
          >
            Contratos ({imovel.contratos.length})
          </button>
          <button
            className={`aba-btn ${abaAtiva === "pagamentos" ? "ativa" : ""}`}
            onClick={() => setAbaAtiva("pagamentos")}
          >
            Pagamentos ({imovel.pagamentos.length})
          </button>
          <button
            className={`aba-btn ${abaAtiva === "vistorias" ? "ativa" : ""}`}
            onClick={() => setAbaAtiva("vistorias")}
          >
            Vistorias & Manutenções ({imovel.vistorias.length})
          </button>

        </div>
        {confirmarDesassociacao && (
          <div className="confirmacao-exclusao" role="dialog" aria-modal="true">
            <div className="confirmacao-exclusao-conteudo">
              <h2>Desassociar locatário?</h2>
              <p>O imóvel ficará disponível novamente para uma nova locação.</p>
              <div className="confirmacao-exclusao-acoes">
                <button type="button" onClick={() => setConfirmarDesassociacao(false)}>Cancelar</button>
                <button type="button" className="confirmacao-excluir" onClick={desassociarLocatario}>Desassociar</button>
              </div>
            </div>
          </div>
        )}


        <div className="aba-conteudo">
          {abaAtiva === "contratos" && imovel.contratos.length === 0 && <p>Nenhum registro encontrado.</p>}
          {abaAtiva === "contratos" && imovel.contratos.length > 0 && (
            <table className="tabela-custom">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Locatário</th>
                  <th>Período</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {imovel.contratos.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.codigo}</strong></td>
                    <td>{item.locatario}</td>
                    <td>{item.inicio} até {item.fim}</td>
                    <td>{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td><Badge texto={item.status} cor={item.status === "Vigente" ? "verde" : "cinza"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {abaAtiva === "pagamentos" && imovel.pagamentos.length === 0 && <p>Nenhum registro encontrado.</p>}
          {abaAtiva === "pagamentos" && imovel.pagamentos.length > 0 && (
            <table className="tabela-custom">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Data do pagamento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {imovel.pagamentos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.mesReferencia}</td>
                    <td>{item.vencimento}</td>
                    <td>{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td><Badge texto={item.status} cor={item.status === "Pago" ? "verde" : "amarelo"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {abaAtiva === "vistorias" && imovel.vistorias.length === 0 && <p>Nenhum registro encontrado.</p>}
          {abaAtiva === "vistorias" && imovel.vistorias.length > 0 && (
            <table className="tabela-custom">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Situação / Laudo</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {imovel.vistorias.map((item) => (
                  <tr key={item.id}>
                    <td>{item.data}</td>
                    <td>{item.tipo}</td>
                    <td>{item.responsavel}</td>
                    <td>{item.observacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}


        </div>
      </div>
    </>
  );
}

export default VisaoGeralImovel;
