import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import CardImovel from "./components/CardImovel";
import Paginacao from "./components/Paginacao";

const ITENS_POR_PAGINA = 4;

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
                            const rawPath = midias[0].filePath.replace(/\\/g, '/');
                            foto = rawPath.startsWith('http') 
                                ? rawPath 
                                : `file:///${encodeURI(rawPath)}`;
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

    async function handleRemover(id) {
        if (window.confirm("Tem certeza que deseja excluir este imóvel?")) {
            try {
                await window.api.properties.delete(id);
                setImoveis((prev) => prev.filter((imovel) => imovel.id !== id));
            } catch (error) {
                console.error("Erro ao remover:", error);
                alert("Erro ao remover o imóvel: " + error.message);
            }
        }
    }

    // Passa o objeto completo do imóvel pela memória da navegação (state)
    function handleEditar(imovel) {
        navigate("/imoveis/cadastrar", { state: { imovelEditar: imovel } });
    }

    const totalPaginas = Math.ceil(imoveis.length / ITENS_POR_PAGINA) || 1;

    useEffect(() => {
        if (pagina > totalPaginas) {
            setPagina(totalPaginas);
        }
    }, [imoveis.length, pagina, totalPaginas]);

    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    const imoveisPaginados = imoveis.slice(inicio, inicio + ITENS_POR_PAGINA);

    return (
        <>
            <style>
                {`
                    .imoveis-topo {
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                        margin-bottom: 24px;
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
                <div className="imoveis-acao">
                    <Button
                        texto="Cadastrar imóvel"
                        type="button"
                        /* Se clicar em cadastrar, garante que o estado de edição vai vazio */
                        onClick={() => navigate("/imoveis/cadastrar", { state: null })}
                    />
                </div>
            </div>

            <div className="imoveis-grade">
                {imoveisPaginados.map((imovel) => (
                    <CardImovel 
                        key={imovel.id} 
                        id={imovel.id.substring(0, 6)} 
                        titulo={imovel.title}
                        endereco={imovel.address} 
                        valor={imovel.price} 
                        tipo="Residencial" 
                        status={imovel.status} 
                        foto={imovel.foto} 
                        onEditar={() => handleEditar(imovel)}
                        onRemover={() => handleRemover(imovel.id)}
                    />
                ))}
            </div>

            {imoveis.length > ITENS_POR_PAGINA && (
                <Paginacao 
                    paginaAtual={pagina} 
                    totalPaginas={totalPaginas} 
                    onMudar={setPagina} 
                />
            )}
        </>
    );
}

export default Imoveis;