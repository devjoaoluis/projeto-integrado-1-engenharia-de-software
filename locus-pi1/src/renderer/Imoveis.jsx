import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import CardImovel from "./components/CardImovel";
import Paginacao from "./components/Paginacao";

function Imoveis() {
    const navigate = useNavigate();
    const [pagina, setPagina] = useState(1);
    const [imoveis, setImoveis] = useState([]);

    useEffect(() => {
        carregarImoveis();
    }, []);

    async function carregarImoveis() {
        try {
            const dados = await window.api.properties.list();
            
            const imoveisComFoto = await Promise.all(
                dados.map(async (imovel) => {
                    let foto = "";
                    try {
                        const midias = await window.api.propertyMedia.list(imovel.id);
                        if (midias && midias.length > 0) {
                            // Ensure the path is properly formatted for URI
                            const filePath = midias[0].filePath.replace(/\\/g, '/');
                            foto = `file:///${filePath}`;
                        }
                    } catch (err) {
                        console.error("Erro ao carregar mídia para", imovel.id, err);
                    }
                    return { ...imovel, foto };
                })
            );

            setImoveis(imoveisComFoto);
        } catch (error) {
            console.error("Erro ao listar imóveis:", error);
        }
    }

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
                {imoveis.map((imovel) => (
                    <CardImovel 
                        key={imovel.id} 
                        id={imovel.id.substring(0, 6)} 
                        titulo={imovel.title}
                        endereco={imovel.address} 
                        valor={imovel.price} 
                        tipo="Residencial" 
                        status={imovel.status} 
                        foto={imovel.foto} 
                    />
                ))}
            </div>

            {imoveis.length > 4 && (
                <Paginacao paginaAtual={pagina} totalPaginas={Math.ceil(imoveis.length / 4) || 1} onMudar={setPagina} />
            )}
        </>
    );
}

export default Imoveis;