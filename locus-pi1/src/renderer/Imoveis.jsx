import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import CardImovel from "./components/CardImovel";
import Paginacao from "./components/Paginacao";
import { mensagemErro } from "./utils/mensagemErro";

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
    const [imovelParaRemover, setImovelParaRemover] = useState(null);
    const [removendo, setRemovendo] = useState(false);

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

    async function confirmarRemocao() {
        if (!imovelParaRemover) return;
        const imovelId = imovelParaRemover.id;
        setImovelParaRemover(null);
        setRemovendo(true);
        try {
            setErro("");
            await window.api.properties.delete(imovelId);
            setImoveis((prev) => prev.filter((imovel) => imovel.id !== imovelId));
        } catch (error) {
            console.error("Erro ao remover:", error);
            setErro(mensagemErro(error, "Não foi possível excluir o imóvel."));
        } finally {
            setRemovendo(false);
        }
    }

    function handleEditar(imovel) {
        window.api.properties.get(imovel.id)
            .then((completo) => navigate("/imoveis/cadastrar", { state: { imovelEditar: completo } }))
            .catch((error) => {
                console.error("Erro ao carregar imóvel para edição:", error);
                setErro("Não foi possível carregar os dados completos do imóvel. Atualize a lista e tente novamente.");
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

                    .imoveis-erro {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        margin: 0 0 24px;
                        padding: 14px 16px;
                        border: 1px solid #f2b8b5;
                        border-radius: 8px;
                        background: #fff5f5;
                        color: #8a1c1c;
                    }

                    .imoveis-erro strong {
                        display: block;
                        margin-bottom: 4px;
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

            {erro && (
                <div className="imoveis-erro" role="alert">
                    <span aria-hidden="true">!</span>
                    <div>
                        <strong>Não foi possível excluir o imóvel</strong>
                        <span>{erro}</span>
                    </div>
                </div>
            )}

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
                        onRemover={() => {
                            if (removendo) return;
                            setErro("");
                            setImovelParaRemover(imovel);
                        }}
                    />
                ))}
            </div>

            {imovelParaRemover && (
                <div className="confirmacao-exclusao" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao-exclusao">
                    <div className="confirmacao-exclusao-conteudo">
                        <h2 id="titulo-confirmacao-exclusao">Excluir imóvel?</h2>
                        <p>Tem certeza que deseja excluir “{imovelParaRemover.title}”?</p>
                        <div className="confirmacao-exclusao-acoes">
                            <button type="button" onClick={() => setImovelParaRemover(null)}>Cancelar</button>
                            <button type="button" className="confirmacao-excluir" onClick={confirmarRemocao}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

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