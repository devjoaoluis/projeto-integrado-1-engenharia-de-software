import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import CardImovel from "./components/CardImovel";
import Paginacao from "./components/Paginacao";

const imoveisMock = [
    { id: 74, endereco: "Rua Doutor José Bezerra, Bairro Esplanada, nº 68, próximo à distribuidora de gás LiquiGás", valor: 1200, tipo: "Comercial", status: "Disponível", foto: "/imoveis/74.jpg" },
    { id: 69, endereco: "Rua Eudásio Barroso de Sousa, Bairro Centro, 2ª nº 201, próximo à praça da Matriz", valor: 500, tipo: "Residencial", status: "Disponível", foto: "/imoveis/69.jpg" },
    { id: 23, endereco: "Rua Doutor Ferreira Gomes, Bairro Centro, nº 456, próximo à praça das mulheres", valor: 1200, tipo: "Comercial", status: "Disponível", foto: "/imoveis/23.jpg" },
    { id: 45, endereco: "Rua Monsenhor Coelho, Bairro Centro, nº 45, próximo a lavanderia C'est La Vie", valor: 700, tipo: "Comercial", status: "Alugado", foto: "/imoveis/45.jpg" },
];

function Imoveis() {
    const navigate = useNavigate();
    const [pagina, setPagina] = useState(1);

    return (
        <>
            <style>
                {`
                    .imoveis-topo {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 24px;
                    }

                    .imoveis-titulo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #1976d2;
                    }

                    .imoveis-acao {
                        width: 200px;
                    }

                    .imoveis-grade {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 24px;
                    }
                `}
            </style>

            <div className="imoveis-topo">
                <h2 className="imoveis-titulo">Imóveis</h2>

                <div className="imoveis-acao">
                    <Button
                        texto="Cadastrar imóvel"
                        type="button"
                        onClick={() => navigate("/imoveis/cadastrar")}
                    />
                </div>
            </div>

            <div className="imoveis-grade">
                {imoveisMock.map((imovel) => (
                    <CardImovel key={imovel.id} {...imovel} />
                ))}
            </div>

            <Paginacao paginaAtual={pagina} totalPaginas={7} onMudar={setPagina} />
        </>
    );
}

export default Imoveis;