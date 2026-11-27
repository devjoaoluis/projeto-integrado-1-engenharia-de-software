import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import CardImovel from "./components/CardImovel";
import Paginacao from "./components/Paginacao";
import { mensagemErro } from "./utils/mensagemErro";
import { mediaFileUrl } from "./propertyOverview.mjs";
import BotaoVoltar from "./components/BotaoVoltar";

const ITENS_POR_PAGINA = 4;

function Imoveis() {
    const navigate = useNavigate();
    const [pagina, setPagina] = useState(1);
    const [imoveis, setImoveis] = useState([]);
    const [total, setTotal] = useState(0);
    const requisicao = useRef(0);
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
    const [imovelParaExcluir, setImovelParaExcluir] = useState(null);
    const [removendo, setRemovendo] = useState(false);

    useEffect(() => {
        carregarImoveis();
        return () => { requisicao.current++; };
    }, [filtrosAplicados, pagina]);

    async function carregarImoveis() {
        const numeroRequisicao = ++requisicao.current;
        setCarregando(true);
        setImoveis([]);
        setErro("");
        try {
            const dadosBusca = {
                q: filtrosAplicados.q.trim() || undefined,
                priceMin: filtrosAplicados.priceMin === "" ? undefined : Number(filtrosAplicados.priceMin),
                priceMax: filtrosAplicados.priceMax === "" ? undefined : Number(filtrosAplicados.priceMax),
                bedrooms: filtrosAplicados.bedrooms === "" ? undefined : Number(filtrosAplicados.bedrooms),
                status: filtrosAplicados.status || undefined,
                page: pagina,
                limit: ITENS_POR_PAGINA,
            };
            const resultado = await window.api.properties.search(dadosBusca);
            if (resultado?.error) {
                const detalhe = resultado.details?.find((item) => item.path?.[0] === "priceMax");
                throw new Error(detalhe?.message || "Confira os valores informados nos filtros.");
            }
            if (numeroRequisicao !== requisicao.current) return;
            const propriedades = resultado?.items || [];
            const quantidade = resultado?.total || 0;
            setTotal(quantidade);
            const ultimaPagina = Math.max(1, Math.ceil(quantidade / ITENS_POR_PAGINA));
            if (pagina > ultimaPagina) {
                setPagina(ultimaPagina);
                return;
            }

            const imoveisComFoto = await Promise.all(
                propriedades.map(async (imovel) => {
                    let foto = "";
                    try {
                        const midias = await window.api.propertyMedia.list(imovel.id);
                        const imagem = midias?.find((midia) => midia.type === "IMAGE");
                        if (imagem) foto = mediaFileUrl(imagem.filePath);
                    } catch (err) {
                        console.error("Erro ao carregar mídia para", imovel.id, err);
                    }
                    return { ...imovel, foto };
                })
            );

            if (numeroRequisicao === requisicao.current) setImoveis(imoveisComFoto);
        } catch (error) {
            console.error("Erro ao listar imóveis:", error);
            if (numeroRequisicao === requisicao.current) {
                setErro(error.message || "Não foi possível carregar os imóveis.");
                setTotal(0);
            }
        } finally {
            if (numeroRequisicao === requisicao.current) setCarregando(false);
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

    async function excluirConfirmado() {
        if (!imovelParaExcluir) return;
        const imovelId = imovelParaExcluir.id;
        setImovelParaExcluir(null);
        setRemovendo(true);
        try {
            setErro("");
            await window.api.properties.delete(imovelId);
            await carregarImoveis();
        } catch (error) {
            console.error("Erro ao excluir:", error);
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

    const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));

    return (
        <>
            <BotaoVoltar destino="/home" texto="Voltar" />
            <style>
                {`
                    .principal { min-width: 0; }
                    .imoveis-grade .card-imovel { min-width: 0; overflow-wrap: anywhere; }
                    .paginacao { flex-wrap: wrap; }

                    .imoveis-topo {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 24px;
                        gap: var(--space-4);
                        flex-wrap: wrap;
                    }

                    .imoveis-titulo {
                        font-size: var(--font-headline-sm);
                        font-weight: 700;
                        color: var(--color-on-surface);
                        margin: 0;
                    }

                    .imoveis-subtitulo {
                        font-size: var(--font-body-md);
                        color: var(--color-on-surface);
                        margin: var(--space-1) 0 0 0;
                    }

                    .imoveis-acao {
                        min-width: 180px;
                    }

                    .imoveis-grade {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: var(--space-5);
                    }

                    .imoveis-filtros {
                        display: grid;
                        grid-template-columns: minmax(0, 2fr) repeat(4, minmax(0, 1fr)) auto auto;
                        gap: var(--space-3);
                        align-items: end;
                        margin-bottom: 24px;
                        padding: var(--space-4) var(--space-4);
                        background: var(--color-surface);
                        border: 1px solid var(--color-outline-variant);
                        border-radius: var(--radius-sm);
                        box-shadow: var(--elevation-2);
                    }

                    .filtro-campo {
                        display: flex;
                        flex-direction: column;
                        gap: var(--space-1);
                        min-width: 0;
                    }

                    .filtro-label {
                        font-size: var(--font-body-md);
                        font-weight: 600;
                        color: var(--color-on-surface-variant);
                        display: block;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .filtro-input {
                        width: 100%;
                        min-width: 0;
                        box-sizing: border-box;
                        height: 40px;
                        padding: 0 var(--space-3);
                        border: 1px solid var(--color-outline-variant);
                        border-radius: var(--radius-sm);
                        background: var(--color-input-surface);
                        color: var(--color-on-surface);
                        font-size: var(--font-body-md);
                        transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    }

                    .filtro-input:focus {
                        outline: none;
                        border-color: var(--color-primary);
                        box-shadow: var(--elevation-2);
                    }

                    .filtro-input::placeholder {
                        color: var(--color-on-surface-variant);
                        font-size: var(--font-body-md);
                    }

                    .filtro-botao {
                        height: 40px;
                        padding: 0 var(--space-4);
                        border: none;
                        border-radius: var(--radius-sm);
                        cursor: pointer;
                        font-weight: 600;
                        font-size: var(--font-body-md);
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color 0.15s ease, border-color 0.15s ease;
                        white-space: nowrap;
                    }

                    .filtro-buscar {
                        background: var(--color-primary-action);
                        color: var(--color-on-primary-action);
                    }

                    .filtro-buscar:hover {
                        background: var(--color-primary-action-hover);
                    }

                    .filtro-limpar {
                        background: var(--color-surface-variant);
                        color: var(--color-on-surface);
                        border: 1px solid var(--color-outline-variant);
                    }

                    .filtro-limpar:hover {
                        background: var(--color-surface-variant);
                        color: var(--color-on-surface);
                    }

                    @media (max-width: 1100px) {
                        .imoveis-filtros {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }
                        .filtro-campo-busca {
                            grid-column: span 2;
                        }
                    }

                    .imoveis-erro {
                        display: flex;
                        align-items: flex-start;
                        gap: var(--space-3);
                        margin: 0 0 var(--space-5);
                        padding: var(--space-3) var(--space-4);
                        border: 1px solid var(--color-error);
                        border-radius: var(--radius-sm);
                        background: var(--color-error-container);
                        color: var(--color-error);
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
                        background: var(--color-scrim);
                        z-index: 1000;
                        backdrop-filter: blur(2px);
                    }

                    .confirmacao-exclusao-conteudo {
                        width: min(420px, calc(100vw - 32px));
                        padding: var(--space-5);
                        border-radius: var(--radius-sm);
                        background: var(--color-surface);
                        box-shadow: var(--elevation-2);
                    }

                    .confirmacao-exclusao-acoes {
                        display: flex;
                        justify-content: flex-end;
                        gap: var(--space-2);
                        margin-top: 20px;
                    }

                    .confirmacao-exclusao-acoes button {
                        min-height: 38px;
                        padding: 0 var(--space-3);
                        border: 0;
                        border-radius: var(--radius-xs);
                        cursor: pointer;
                    }

                    .confirmacao-excluir { color: var(--color-on-danger-action); background: var(--color-danger-action); }
                `}
            </style>

            <div className="imoveis-topo">
                <div>
                    <h1 className="imoveis-titulo">Imóveis</h1>
                    <p className="imoveis-subtitulo">Consulte, filtre e gerencie os imóveis cadastrados no sistema.</p>
                </div>
                <div className="imoveis-acao">
                    <Button
                        className="ui-action ui-action--primary ui-action--large"
                        texto="+ Cadastrar imóvel"
                        type="button"
                        onClick={() => navigate("/imoveis/cadastrar", { state: null })}
                    />
                </div>
            </div>

            <form className="imoveis-filtros" onSubmit={aplicarFiltros} role="search" aria-label="Filtros de busca de imóveis">
                <div className="filtro-campo filtro-campo-busca">
                    <label htmlFor="filtro-busca" className="filtro-label">
                        Endereço ou bairro
                    </label>
                    <input
                        id="filtro-busca"
                        className="filtro-input"
                        name="q"
                        type="search"
                        value={filtros.q}
                        onChange={atualizarFiltro}
                        placeholder="Ex.: Centro ou Rua das Flores"
                    />
                </div>

                <div className="filtro-campo">
                    <label htmlFor="filtro-preco-min" className="filtro-label">
                        Preço mín. (R$)
                    </label>
                    <input
                        id="filtro-preco-min"
                        className="filtro-input"
                        name="priceMin"
                        type="number"
                        min="0"
                        step="0.01"
                        value={filtros.priceMin}
                        onChange={atualizarFiltro}
                        placeholder="0,00"
                    />
                </div>

                <div className="filtro-campo">
                    <label htmlFor="filtro-preco-max" className="filtro-label">
                        Preço máx. (R$)
                    </label>
                    <input
                        id="filtro-preco-max"
                        className="filtro-input"
                        name="priceMax"
                        type="number"
                        min="0"
                        step="0.01"
                        value={filtros.priceMax}
                        onChange={atualizarFiltro}
                        placeholder="Sem limite"
                    />
                </div>

                <div className="filtro-campo">
                    <label htmlFor="filtro-quartos" className="filtro-label">
                        Quartos (mín.)
                    </label>
                    <input
                        id="filtro-quartos"
                        className="filtro-input"
                        name="bedrooms"
                        type="number"
                        min="0"
                        step="1"
                        value={filtros.bedrooms}
                        onChange={atualizarFiltro}
                        placeholder="Todos"
                    />
                </div>

                <div className="filtro-campo">
                    <label htmlFor="filtro-situacao" className="filtro-label">
                        Situação
                    </label>
                    <select
                        id="filtro-situacao"
                        className="filtro-input"
                        name="status"
                        value={filtros.status}
                        onChange={atualizarFiltro}
                    >
                        <option value="">Todas</option>
                        <option value="DISPONIVEL">Disponível</option>
                        <option value="ALUGADO">Alugado</option>
                        <option value="CADASTRADO">Cadastrado</option>
                        <option value="VENDIDO">Vendido</option>
                        <option value="INATIVO">Inativo</option>
                    </select>
                </div>

                <button className="filtro-botao filtro-buscar ui-action ui-action--primary" type="submit">Buscar</button>
                <button className="filtro-botao filtro-limpar ui-action ui-action--neutral" type="button" onClick={limparFiltros}>Limpar</button>
            </form>

            {erro && (
                <div className="imoveis-erro" role="alert">
                    <span aria-hidden="true">!</span>
                    <div>
                        <strong>Não foi possível concluir a operação</strong>
                        <span>{erro}</span>
                    </div>
                </div>
            )}

            {carregando && <p role="status" style={{ color: "var(--color-on-surface)", textAlign: "center", padding: "var(--space-6) 0" }}>Carregando imóveis...</p>}
            {!carregando && !erro && imoveis.length === 0 && (
                <div style={{ textAlign: "center", padding: "var(--space-7) var(--space-5)", background: "var(--color-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-outline-variant)" }}>
                    <p style={{ fontSize: "var(--font-body-lg)", fontWeight: "600", color: "var(--color-on-surface)", margin: 0 }}>Nenhum imóvel encontrado</p>
                    <p style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)", margin: "var(--space-1) 0 var(--space-4) 0" }}>Tente ajustar os filtros de busca ou cadastre um novo imóvel.</p>
                    <button
                        className="ui-action ui-action--neutral"
                        type="button"
                        onClick={limparFiltros}
                    >
                        Limpar filtros
                    </button>
                </div>
            )}

            <div className="imoveis-grade">
                {imoveis.map((imovel) => (
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
                        onExcluir={() => {
                            if (removendo) return;
                            setErro("");
                            setImovelParaExcluir(imovel);
                        }}
                    />
                ))}
            </div>

            {imovelParaExcluir && (
                <div className="confirmacao-exclusao" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao-exclusao">
                    <div className="confirmacao-exclusao-conteudo">
                        <h2 id="titulo-confirmacao-exclusao">Excluir imóvel?</h2>
                        <p>Tem certeza que deseja excluir “{imovelParaExcluir.title}”? Esta ação não pode ser desfeita.</p>
                        <div className="confirmacao-exclusao-acoes">
                            <button className="ui-action ui-action--neutral" type="button" onClick={() => setImovelParaExcluir(null)}>Cancelar</button>
                            <button type="button" className="confirmacao-excluir ui-action ui-action--destructive" onClick={excluirConfirmado}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {!carregando && !erro && totalPaginas > 1 && (
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
