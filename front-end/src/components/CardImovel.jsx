import Badge from "./Badge";

function CardImovel({ id, endereco, valor, tipo, status, foto }) {
    const corStatus = status === "Disponível" ? "verde" : "vermelho";

    const valorFormatado = valor.toLocaleString("pt-BR", {
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
                    }

                    .card-imovel-etiquetas {
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                `}
            </style>

            <div className="card-imovel">
                {foto ? (
                    <img className="card-imovel-foto" src={foto} alt={`Imóvel #${id}`} />
                ) : (
                    <div className="card-imovel-foto" />
                )}

                <div className="card-imovel-corpo">
                    <h3 className="card-imovel-titulo">Imóvel #{id}</h3>
                    <p className="card-imovel-endereco">{endereco}</p>

                    <div className="card-imovel-etiquetas">
                        <Badge texto={status} cor={corStatus} />
                        <Badge texto={valorFormatado} />
                        <Badge texto={tipo} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default CardImovel;