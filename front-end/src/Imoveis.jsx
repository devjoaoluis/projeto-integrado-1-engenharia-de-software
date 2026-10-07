import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { imoveisDemo } from "./imoveisDemo";
import Button from "./Button";
import CardImovel from "./components/CardImovel";
import Paginacao from "./components/Paginacao";



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

            <p>Dados de demonstração.</p>
            <div className="imoveis-grade">
                {imoveisDemo.map((imovel) => (
                    <CardImovel key={imovel.id} {...imovel} />
                ))}
            </div>

            <Paginacao paginaAtual={pagina} totalPaginas={7} onMudar={setPagina} />
        </>
    );
}

export default Imoveis;