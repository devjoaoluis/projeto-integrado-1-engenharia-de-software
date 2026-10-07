import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "./Button";
import Badge from "./components/Badge";

const imovelDetalhadoMock = {
  id: 74,
  endereco: "Rua Doutor José Bezerra, Bairro Esplanada, nº 68, próximo à distribuidora de gás LiquiGás",
  valor: 1200,
  tipo: "Comercial",
  status: "Disponível",
  foto: "/imoveis/74.jpg",
  proprietario: "Maria das Graças",
  contratos: [
    { id: "CTR-2024-01", locatario: "João Silva", inicio: "10/01/2024", fim: "10/01/2025", status: "Vigente", valor: 1200 },
    { id: "CTR-2023-05", locatario: "Empresa X LTDA", inicio: "01/01/2023", fim: "31/12/2023", status: "Encerrado", valor: 1100 }
  ],
  pagamentos: [
    { id: 101, mesReferencia: "Setembro/2026", vencimento: "10/09/2026", valor: 1200, status: "Pago" },
    { id: 102, mesReferencia: "Outubro/2026", vencimento: "10/10/2026", valor: 1200, status: "Pendente" }
  ],
  vistorias: [
    { id: 1, data: "05/01/2024", tipo: "Entrada", responsavel: "Carlos Vistoriador", observacao: "Imóvel em excelente estado de pintura." },
    { id: 2, data: "15/08/2025", tipo: "Manutenção", responsavel: "Técnico Elétrico", observacao: "Troca do disjuntor principal." }
  ],
  visitas: [
    { id: 1, data: "02/10/2026", visitante: "Ana Lima", corretor: "Pedro Corretor", status: "Realizada" },
    { id: 2, data: "12/10/2026", visitante: "Marcos Paulo", corretor: "Pedro Corretor", status: "Agendada" }
  ]
};

function VisaoGeralImovel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState("contratos");

  const imovel = imovelDetalhadoMock;

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
          <img className="imovel-header-img" src={imovel.foto} alt={`Imóvel #${imovel.id}`} />
          <div className="imovel-header-info">
            <h2 className="imovel-titulo">Visão Geral - Imóvel #{imovel.id}</h2>
            <p className="imovel-endereco">{imovel.endereco}</p>
            <p style={{ margin: 0, fontSize: "14px", color: "#444" }}>
              <strong>Proprietário:</strong> {imovel.proprietario}
            </p>

            <div className="imovel-tags">
              <Badge texto={imovel.status} cor={imovel.status === "Disponível" ? "verde" : "vermelho"} />
              <Badge texto={valorFormatado} />
              <Badge texto={imovel.tipo} />
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
          <button
            className={`aba-btn ${abaAtiva === "visitas" ? "ativa" : ""}`}
            onClick={() => setAbaAtiva("visitas")}
          >
            Visitas ({imovel.visitas.length})
          </button>
        </div>

        
        <div className="aba-conteudo">
          {abaAtiva === "contratos" && (
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
                    <td><strong>{item.id}</strong></td>
                    <td>{item.locatario}</td>
                    <td>{item.inicio} até {item.fim}</td>
                    <td>R$ {item.valor},00</td>
                    <td><Badge texto={item.status} cor={item.status === "Vigente" ? "verde" : "cinza"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {abaAtiva === "pagamentos" && (
            <table className="tabela-custom">
              <thead>
                <tr>
                  <th>Referência</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {imovel.pagamentos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.mesReferencia}</td>
                    <td>{item.vencimento}</td>
                    <td>R$ {item.valor},00</td>
                    <td><Badge texto={item.status} cor={item.status === "Pago" ? "verde" : "amarelo"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {abaAtiva === "vistorias" && (
            <table className="tabela-custom">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Responsável</th>
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

          {abaAtiva === "visitas" && (
            <table className="tabela-custom">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Visitante</th>
                  <th>Corretor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {imovel.visitas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.data}</td>
                    <td>{item.visitante}</td>
                    <td>{item.corretor}</td>
                    <td><Badge texto={item.status} cor={item.status === "Realizada" ? "verde" : "azul"} /></td>
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