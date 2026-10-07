import { useState } from "react";
import Badge from "./Badge";

function CardImovel({ id, titulo, endereco, valor, tipo, status, foto, onEditar, onRemover }) {
    const [erroImagem, setErroImagem] = useState(false);
    const corStatus = status === "Disponível" ? "verde" : "vermelho";

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
                        background-color: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
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
                        background-color: #d9d9d9;
                    }

                    .card-imovel-corpo {
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        flex-grow: 1;
                    }

                    .card-imovel-titulo {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 8px;
                    }

                    .card-imovel-endereco {
                        font-size: 13px;
                        color: #555555;
                        margin-bottom: 20px;
                        flex-grow: 1;
                    }

                    .card-imovel-etiquetas {
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                        margin-bottom: 16px;
                    }

                    .card-imovel-acoes {
                        display: flex;
                        gap: 10px;
                        border-top: 1px solid #eeeeee;
                        padding-top: 16px;
                    }

                    .card-btn-editar, .card-btn-remover {
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background-color 0.2s;
                    }

                    .card-btn-editar {
                        background-color: #f0f0f0;
                        color: #333333;
                    }

                    .card-btn-editar:hover {
                        background-color: #e0e0e0;
                    }

                    .card-btn-remover {
                        background-color: #ffeeee;
                        color: #d32f2f;
                    }

                    .card-btn-remover:hover {
                        background-color: #ffdddd;
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
                    <div className="card-imovel-foto" />
                )}

                <div className="card-imovel-corpo">
                    <h3 className="card-imovel-titulo">{titulo || `Imóvel #${id}`}</h3>
                    <p className="card-imovel-endereco">{endereco}</p>

                    <div className="card-imovel-etiquetas">
                        <Badge texto={status || "Disponível"} cor={corStatus} />
                        <Badge texto={valorFormatado} />
                        {tipo && <Badge texto={tipo} />}
                    </div>

                    <div className="card-imovel-acoes">
                        <button 
                            className="card-btn-editar"
                            onClick={() => onEditar && onEditar(id)}
                            title="Editar imóvel"
                        >
                            Editar
                        </button>
                        <button 
                            className="card-btn-remover"
                            onClick={() => onRemover && onRemover(id)}
                            title="Remover imóvel"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default CardImovel;