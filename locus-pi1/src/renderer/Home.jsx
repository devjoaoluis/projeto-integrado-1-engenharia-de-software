
import { useEffect, useState } from "react";
import {
  Building2,
  FileCheck,
  Home as HomeIcon,
  FileText,
  RefreshCw,
  ChartNoAxesColumn,
  ChartPie,
} from "lucide-react";

function Home() {
  const [imoveis, setImoveis] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const [listaImoveis, historicoContratos] = await Promise.all([
        window.api.properties.list(),
        window.api.rentals.listContractHistory(),
      ]);

      setImoveis(Array.isArray(listaImoveis) ? listaImoveis : []);
      setContratos(
        Array.isArray(historicoContratos) ? historicoContratos : []
      );
    } catch (error) {
      console.error("Erro ao carregar dados da Home:", error);
      setErro("Não foi possível carregar os dados do painel.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const totalImoveis = imoveis.length;

  const disponiveis = imoveis.filter(
    (imovel) => String(imovel.status).toUpperCase() === "DISPONIVEL"
  ).length;

  const alugados = imoveis.filter(
    (imovel) => String(imovel.status).toUpperCase() === "ALUGADO"
  ).length;

  const ativos = contratos.filter(
    (contrato) => String(contrato.status).toUpperCase() === "ACTIVE"
  ).length;

  const encerrados = contratos.filter(
    (contrato) => String(contrato.status).toUpperCase() === "ENDED"
  ).length;

  const cancelados = contratos.filter(
    (contrato) => String(contrato.status).toUpperCase() === "CANCELLED"
  ).length;

  function obterData(valor) {
    if (!valor) return null;

    let data;

    if (typeof valor === "number") {
      data = new Date(valor < 1000000000000 ? valor * 1000 : valor);
    } else {
      data = new Date(valor);
    }

    return Number.isNaN(data.getTime()) ? null : data;
  }

  function obterMeses() {
    const hoje = new Date();

    return Array.from({ length: 6 }, (_, indice) => {
      const data = new Date(
        hoje.getFullYear(),
        hoje.getMonth() - (5 - indice),
        1
      );

      return {
        chave: `${data.getFullYear()}-${data.getMonth()}`,
        nome: data.toLocaleDateString("pt-BR", {
          month: "short",
        }).replace(".", ""),
        quantidade: 0,
      };
    });
  }

  const meses = obterMeses();

  contratos.forEach((contrato) => {
    const data = obterData(contrato.createdAt);
    if (!data) return;

    const chave = `${data.getFullYear()}-${data.getMonth()}`;
    const mes = meses.find((item) => item.chave === chave);

    if (mes) mes.quantidade++;
  });

  const maiorQuantidade = Math.max(
    ...meses.map((mes) => mes.quantidade),
    1
  );

  const totalSituacaoImoveis = disponiveis + alugados;
  const percentualDisponiveis = totalSituacaoImoveis
    ? (disponiveis / totalSituacaoImoveis) * 100
    : 0;

  const totalSituacaoContratos = ativos + encerrados + cancelados;

  const percentualAtivos = totalSituacaoContratos
    ? (ativos / totalSituacaoContratos) * 100
    : 0;

  const percentualEncerrados = totalSituacaoContratos
    ? (encerrados / totalSituacaoContratos) * 100
    : 0;

  const percentualCancelados = totalSituacaoContratos
    ? (cancelados / totalSituacaoContratos) * 100
    : 0;

  if (carregando) {
    return (
      <div className="home-carregando">
        <RefreshCw size={22} className="home-girando" />
        <span>Carregando painel...</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="home-erro">
        <p>{erro}</p>
        <button onClick={carregarDados}>
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="home-dashboard">
      <style>{`
        .home-dashboard {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          color: #1e293b;
        }

        .home-boas-vindas {
          margin-bottom: 24px;
        }

        .home-boas-vindas h2 {
          font-size: 21px;
          margin-bottom: 6px;
          color: #1e293b;
        }

        .home-boas-vindas p {
          color: #64748b;
          font-size: 14px;
        }

        .home-indicadores {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }

        .home-indicador {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 22px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(15, 23, 42, .04);
        }

        .home-indicador-icone {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          flex-shrink: 0;
        }

        .home-indicador-info span {
          display: block;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .home-indicador-info strong {
          font-size: 27px;
          color: #1e293b;
        }

        .home-graficos {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .home-grafico {
          min-width: 0;
          padding: 22px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(15, 23, 42, .04);
        }

        .home-grafico-largo {
          grid-column: 1 / -1;
        }

        .home-grafico-cabecalho {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
        }

        .home-grafico-cabecalho h3 {
          font-size: 15px;
          color: #1e293b;
        }

        .home-grafico-cabecalho span {
          font-size: 12px;
          color: #94a3b8;
        }

        .home-donut-area {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          min-height: 190px;
          flex-wrap: wrap;
        }

        .home-donut {
          width: 155px;
          height: 155px;
          border-radius: 50%;
          position: relative;
          flex-shrink: 0;
        }

        .home-donut-centro {
          position: absolute;
          inset: 27px;
          border-radius: 50%;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .home-donut-centro strong {
          font-size: 25px;
          color: #1e293b;
        }

        .home-donut-centro span {
          font-size: 11px;
          color: #64748b;
        }

        .home-legenda {
          display: flex;
          flex-direction: column;
          gap: 15px;
          min-width: 130px;
        }

        .home-legenda-item {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          color: #475569;
        }

        .home-legenda-cor {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .home-legenda-item strong {
          margin-left: auto;
          color: #1e293b;
          padding-left: 12px;
        }

        .home-barras {
          display: flex;
          flex-direction: column;
          gap: 19px;
        }

        .home-barra-item {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .home-barra-topo {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #475569;
        }

        .home-barra-trilho {
          height: 10px;
          width: 100%;
          background: #f1f5f9;
          border-radius: 10px;
          overflow: hidden;
        }

        .home-barra-preenchimento {
          height: 100%;
          border-radius: 10px;
          transition: width .3s ease;
        }

        .home-grafico-colunas {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 12px;
          height: 205px;
          padding-top: 10px;
          border-bottom: 1px solid #e2e8f0;
        }

        .home-coluna-item {
          flex: 1;
          max-width: 85px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
        }

        .home-coluna-valor {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .home-coluna {
          width: 100%;
          max-width: 45px;
          min-height: 3px;
          background: #3b82f6;
          border-radius: 5px 5px 0 0;
          transition: height .3s ease;
        }

        .home-coluna-mes {
          font-size: 11px;
          color: #64748b;
          text-transform: capitalize;
          padding-bottom: 10px;
        }

        .home-vazio {
          width: 100%;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          padding: 35px 10px;
        }

        .home-carregando,
        .home-erro {
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          color: #64748b;
        }

        .home-erro button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 0;
          border-radius: 6px;
          background: #2563eb;
          color: white;
          cursor: pointer;
        }

        .home-girando {
          animation: home-girar 1s linear infinite;
        }

        @keyframes home-girar {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 850px) {
          .home-graficos {
            grid-template-columns: 1fr;
          }

          .home-grafico-largo {
            grid-column: auto;
          }
        }

        @media (max-width: 550px) {
          .home-indicadores {
            grid-template-columns: 1fr;
          }

          .home-grafico {
            padding: 16px;
          }

          .home-donut-area {
            gap: 20px;
          }
        }
      `}</style>

      <div className="home-boas-vindas">
        <h2>Visão geral</h2>
        <p>Acompanhe os principais dados da sua imobiliária.</p>
      </div>

      <section className="home-indicadores">
        <div className="home-indicador">
          <div className="home-indicador-icone">
            <Building2 size={25} />
          </div>
          <div className="home-indicador-info">
            <span>Total de imóveis</span>
            <strong>{totalImoveis}</strong>
          </div>
        </div>

        <div className="home-indicador">
          <div className="home-indicador-icone">
            <FileCheck size={25} />
          </div>
          <div className="home-indicador-info">
            <span>Contratos ativos</span>
            <strong>{ativos}</strong>
          </div>
        </div>
      </section>

      <section className="home-graficos">
        <div className="home-grafico">
          <div className="home-grafico-cabecalho">
            <h3>
              <HomeIcon size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />
              Situação dos imóveis
            </h3>
            <span>{totalImoveis} imóveis</span>
          </div>

          {totalSituacaoImoveis === 0 ? (
            <div className="home-vazio">Nenhum imóvel cadastrado.</div>
          ) : (
            <div className="home-donut-area">
              <div
                className="home-donut"
                style={{
                  background: `conic-gradient(#2563eb 0% ${percentualDisponiveis}%, #16a34a ${percentualDisponiveis}% 100%)`,
                }}
              >
                <div className="home-donut-centro">
                  <strong>{totalSituacaoImoveis}</strong>
                  <span>Imóveis</span>
                </div>
              </div>

              <div className="home-legenda">
                <div className="home-legenda-item">
                  <span className="home-legenda-cor" style={{ background: "#2563eb" }} />
                  Disponíveis
                  <strong>{disponiveis}</strong>
                </div>
                <div className="home-legenda-item">
                  <span className="home-legenda-cor" style={{ background: "#16a34a" }} />
                  Alugados
                  <strong>{alugados}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="home-grafico">
          <div className="home-grafico-cabecalho">
            <h3>
              <ChartPie size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />
              Situação dos contratos
            </h3>
            <span>{totalSituacaoContratos} contratos</span>
          </div>

          {totalSituacaoContratos === 0 ? (
            <div className="home-vazio">Nenhum contrato registrado.</div>
          ) : (
            <div className="home-barras">
              <div className="home-barra-item">
                <div className="home-barra-topo">
                  <span>Ativos</span>
                  <strong>{ativos}</strong>
                </div>
                <div className="home-barra-trilho">
                  <div
                    className="home-barra-preenchimento"
                    style={{ width: `${percentualAtivos}%`, background: "#2563eb" }}
                  />
                </div>
              </div>

              <div className="home-barra-item">
                <div className="home-barra-topo">
                  <span>Encerrados</span>
                  <strong>{encerrados}</strong>
                </div>
                <div className="home-barra-trilho">
                  <div
                    className="home-barra-preenchimento"
                    style={{ width: `${percentualEncerrados}%`, background: "#16a34a" }}
                  />
                </div>
              </div>

              <div className="home-barra-item">
                <div className="home-barra-topo">
                  <span>Cancelados</span>
                  <strong>{cancelados}</strong>
                </div>
                <div className="home-barra-trilho">
                  <div
                    className="home-barra-preenchimento"
                    style={{ width: `${percentualCancelados}%`, background: "#f59e0b" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="home-grafico home-grafico-largo">
          <div className="home-grafico-cabecalho">
            <h3>
              <ChartNoAxesColumn size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />
              Contratos criados por mês
            </h3>
            <span>Últimos 6 meses</span>
          </div>

          {meses.every((mes) => mes.quantidade === 0) ? (
            <div className="home-vazio">
              Nenhum contrato criado nesse período.
            </div>
          ) : (
            <div className="home-grafico-colunas">
              {meses.map((mes) => (
                <div className="home-coluna-item" key={mes.chave}>
                  <span className="home-coluna-valor">
                    {mes.quantidade}
                  </span>
                  <div
                    className="home-coluna"
                    style={{
                      height: `${(mes.quantidade / maiorQuantidade) * 140}px`,
                    }}
                    title={`${mes.quantidade} contratos`}
                  />
                  <span className="home-coluna-mes">{mes.nome}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
