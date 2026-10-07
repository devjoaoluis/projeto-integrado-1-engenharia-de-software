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
    const [filtros, setFiltros] = useState({
        q: "",
        priceMin: "",
        priceMax: "",
        bedrooms: "",
        status: "",
    });
    const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        carregarImoveis();
    }, [filtrosAplicados]);

    async function carregarImoveis() {
        setCarregando(true);
        setErro("");
        try {
            const dadosBusca = {
                q: filtrosAplicados.q.trim() || undefined,
                priceMin: filtrosAplicados.priceMin === "" ? undefined : Number(filtrosAplicados.priceMin),
                priceMax: filtrosAplicados.priceMax === "" ? undefined : Number(filtrosAplicados.priceMax),
                bedrooms: filtrosAplicados.bedrooms === "" ? undefined : Number(filtrosAplicados.bedrooms),
                status: filtrosAplicados.status || undefined,
                page: 1,
                limit: 100,
            };
            const resultado = await window.api.properties.search(dadosBusca);
            const propriedades = resultado?.items || [];

            const imoveisComFoto = await Promise.all(
                propriedades.map(async (imovel) => {
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
            setErro(error.message || "Não foi possível carregar os imóveis.");
        } finally {
            setCarregando(false);
        }
    }

    function atualizarFiltro(event) {
        const { name, value } = event.target;
        setFiltros((atual) => ({ ...atual, [name]: value }));
    }

    function aplicarFiltros(event) {
        event.preventDefault();
        setPagina(1);
        setFiltrosAplicados({ ...filtros });
    }

    function limparFiltros() {
        const vazios = { q: "", priceMin: "", priceMax: "", bedrooms: "", status: "" };
        setFiltros(vazios);
        setFiltrosAplicados(vazios);
        setPagina(1);
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

    function handleEditar(imovel) {
        window.api.properties.get(imovel.id)
            .then((completo) => navigate("/imoveis/cadastrar", { state: { imovelEditar: completo } }))
            .catch((error) => {
                console.error("Erro ao carregar imóvel para edição:", error);
                alert("Não foi possível carregar os dados completos do imóvel.");
            });
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
                        justify-content: space-between;
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

                    .imoveis-filtros {
                        display: grid;
                        grid-template-columns: 2fr repeat(4, 1fr) auto auto;
                        gap: 10px;
                        align-items: end;
                        margin-bottom: 24px;
                        padding: 16px;
                        background: #f5f7fa;
                        border-radius: 8px;
                    }

                    .imoveis-filtros label {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        color: #555;
                        font-size: 12px;
                        font-weight: 600;
                    }

                    .imoveis-filtros input, .imoveis-filtros select {
                        min-height: 38px;
                        padding: 0 10px;
                        border: 1px solid #c8cdd2;
                        border-radius: 4px;
                        background: white;
                    }

                    .filtro-botao {
                        min-height: 38px;
                        padding: 0 14px;
                        border: none;
                        border-radius: 4px;
                        background: #1976d2;
                        color: white;
                        cursor: pointer;
                        font-weight: 600;
                    }

                    .filtro-limpar {
                        background: #e5e7eb;
                        color: #333;
                    }
                `}
            </style>

            <div className="imoveis-topo">
                <div className="imoveis-acao">
                    <Button
                        texto="Cadastrar imóvel"
                        type="button"
                        onClick={() => navigate("/imoveis/cadastrar", { state: null })}
                    />
                </div>
            </div>

            <form className="imoveis-filtros" onSubmit={aplicarFiltros}>
                <label>
                    Buscar por endereço ou bairro
                    <input name="q" value={filtros.q} onChange={atualizarFiltro} placeholder="Ex.: Centro ou Rua A" />
                </label>
                <label>
                    Preço mínimo
                    <input name="priceMin" type="number" min="0" step="0.01" value={filtros.priceMin} onChange={atualizarFiltro} />
                </label>
                <label>
                    Preço máximo
                    <input name="priceMax" type="number" min="0" step="0.01" value={filtros.priceMax} onChange={atualizarFiltro} />
                </label>
                <label>
                    Quartos (mínimo)
                    <input name="bedrooms" type="number" min="0" step="1" value={filtros.bedrooms} onChange={atualizarFiltro} />
                </label>
                <label>
                    Situação
                    <select name="status" value={filtros.status} onChange={atualizarFiltro}>
                        <option value="">Todas</option>
                        <option value="CADASTRADO">Cadastrado</option>
                        <option value="DISPONIVEL">Disponível</option>
                        <option value="ALUGADO">Alugado</option>
                        <option value="VENDIDO">Vendido</option>
                        <option value="INATIVO">Inativo</option>
                    </select>
                </label>
                <button className="filtro-botao" type="submit">Buscar</button>
                <button className="filtro-botao filtro-limpar" type="button" onClick={limparFiltros}>Limpar</button>
            </form>

            {erro && <p role="alert">{erro}</p>}
            {carregando && <p role="status">Carregando imóveis...</p>}
            {!carregando && !erro && imoveis.length === 0 && <p>Nenhum imóvel encontrado.</p>}

            <div className="imoveis-grade">
                {imoveisPaginados.map((imovel) => (
                    <CardImovel 
                        key={imovel.id} 
                        id={imovel.id} 
                        titulo={imovel.title}
                        endereco={imovel.address} 
                        valor={imovel.price} 
                        tipo={imovel.type || "Residencial"} 
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