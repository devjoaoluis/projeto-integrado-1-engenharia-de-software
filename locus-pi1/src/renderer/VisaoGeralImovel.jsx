import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adaptPropertyOverview } from "./propertyOverview.mjs";
import Badge from "./components/Badge";

function VisaoGeralImovel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState("contratos");

  const [result, setResult] = useState({ id: null, imovel: null, erro: "" });
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const overview = await window.api.properties.overview(id);
        const contracts = [...overview.contracts.current, ...overview.contracts.previous, ...overview.contracts.scheduled];
        const tenantNames = Object.fromEntries(await Promise.all(
          [...new Set(contracts.map(contract => contract.tenantId))].map(async tenantId => {
            try { return [tenantId, (await window.api.clients.get(tenantId)).name]; }
            catch { return [tenantId, "Locatário não encontrado"]; }
          })
        ));
        if (active) setResult({ id, imovel: adaptPropertyOverview(overview, tenantNames), erro: "" });
      } catch {
        if (active) setResult({ id, imovel: null, erro: "Não foi possível carregar este imóvel. Ele pode ter sido removido." });
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  if (result.id !== id) return <p role="status">Carregando imóvel...</p>;
  if (result.erro) return <div role="alert"><p>{result.erro}</p><button onClick={() => navigate("/imoveis")}>Voltar para Imóveis</button></div>;
  const imovel = result.imovel;

  const valorFormatado = imovel.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

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
          gap: 12px;
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

            <div className="imovel-tags">
              <Badge texto={imovel.status} cor={imovel.status === "Disponível" ? "verde" : "vermelho"} />
              <Badge texto={valorFormatado} />
            </div>
          </div>
        </div>


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
