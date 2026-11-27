import { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Badge from "./Badge";

function CardImovel({ id, titulo, endereco, valor, tipo, status, foto, onEditar, onExcluir }) {
    const [erroImagem, setErroImagem] = useState(false);

    const statusFormatado = {
        DISPONIVEL: "Disponível",
        Disponível: "Disponível",
        ALUGADO: "Alugado",
        Alugado: "Alugado",
        CADASTRADO: "Cadastrado",
        Cadastrado: "Cadastrado",
        VENDIDO: "Vendido",
        Vendido: "Vendido",
        INATIVO: "Inativo",
        Inativo: "Inativo",
    }[status] || status || "Disponível";

    const corStatus = 
        status === "DISPONIVEL" || status === "Disponível" ? "verde" :
        status === "ALUGADO" || status === "Alugado" ? "vermelho" : "cinza";

    const alugado = status === "ALUGADO" || status === "Alugado";

    const valorNumerico = Number(valor) || 0;
    const valorFormatado = valorNumerico.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });

    return (
        <>
            <style>
                {`
                    .card-imovel {
                        background-color: var(--color-surface);
                        border-radius: var(--radius-sm);
                        box-shadow: var(--elevation-2);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                    }

                    .card-imovel-foto {
                        width: 100%;
                        height: 174px;
                        object-fit: cover;
                        display: block;
                        background-color: var(--color-surface-variant);
                    }

                    .card-imovel-foto-placeholder {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: var(--space-2);
                        color: var(--color-outline);
                    }

                    .card-imovel-foto-placeholder span {
                        font-size: var(--font-body-sm);
                    }

                    .card-imovel-corpo {
                        padding: var(--space-4);
                        display: flex;
                        flex-direction: column;
                        flex-grow: 1;
                    }

                    .card-imovel-titulo {
                        font-size: var(--font-body-lg);
                        font-weight: bold;
                        margin-bottom: 8px;
                    }

                    .card-imovel-endereco {
                        font-size: var(--font-body-md);
                        color: var(--color-on-surface);
                        margin-bottom: 20px;
                        flex-grow: 1;
                    }

                    .card-imovel-etiquetas {
                        display: flex;
                        gap: var(--space-2);
                        flex-wrap: wrap;
                        margin-bottom: 16px;
                    }

                    .card-imovel-acoes {
                        display: flex;
                        gap: var(--space-2);
                        border-top: 1px solid var(--color-outline-variant);
                        padding-top: 16px;
                    }

                    .card-imovel-acoes .ui-action {
                        flex: 1;
                        min-width: 0;
                    }

                    .card-btn-excluir:disabled {
                        cursor: not-allowed;
                    }
                `}
            </style>

            <div className="card-imovel">
                {foto && !erroImagem ? (
                    <img 
                        className="card-imovel-foto" 
                        src={foto} 
                        alt={titulo || `Imóvel #${id}`} 
                        onError={() => setErroImagem(true)}
                    />
                ) : (
                    <div className="card-imovel-foto card-imovel-foto-placeholder" role="img" aria-label="Sem foto">
                        <Home size={40} strokeWidth={1.5} aria-hidden="true" />
                        <span>Sem foto</span>
                    </div>
                )}

                <div className="card-imovel-corpo">
                    <h3 className="card-imovel-titulo">
                        <Link to={`/imoveis/${encodeURIComponent(id)}`} aria-label={`Ver detalhes do imóvel ${id}`}>
                            {titulo || `Imóvel #${id}`}
                        </Link>
                    </h3>
                    <p className="card-imovel-endereco">{endereco}</p>

                    <div className="card-imovel-etiquetas">
                        <Badge texto={statusFormatado} cor={corStatus} />
                        <Badge texto={valorFormatado} />
                        {tipo && <Badge texto={tipo} />}
                    </div>

                    <div className="card-imovel-acoes">
                        <button 
                            className="card-btn-editar ui-action ui-action--primary"
                            onClick={() => onEditar && onEditar(id)}
                            title="Editar imóvel"
                        >
                            Editar
                        </button>
                        <Link 
                            to={`/vistorias?imovelId=${encodeURIComponent(id)}`}
                            className="card-btn-vistorias ui-action ui-action--neutral"
                            title="Ver ou registrar vistorias deste imóvel"
                        >
                            Vistorias
                        </Link>
                        <button 
                            className="card-btn-excluir ui-action ui-action--destructive"
                            onClick={() => onExcluir && onExcluir(id)}
                            disabled={alugado}
                            title="Excluir imóvel"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default CardImovel;