import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

function Paginacao({ paginaAtual, totalPaginas, onMudar }) {
    const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);

    return (
        <>
            <style>
                {`
                    .paginacao {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 12px;
                        margin-top: 24px;
                    }

                    .pag-btn {
                        width: 28px;
                        height: 28px;
                        border: none;
                        border-radius: 50%;
                        background-color: transparent;
                        color: #333333;
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }

                    .pag-btn:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                    }

                    .pag-btn.ativo {
                        background-color: #1976d2;
                        color: white;
                    }
                `}
            </style>

            <div className="paginacao">
                <button className="pag-btn" onClick={() => onMudar(1)} disabled={paginaAtual === 1}>
                    <ChevronsLeft size={16} />
                </button>
                <button className="pag-btn" onClick={() => onMudar(paginaAtual - 1)} disabled={paginaAtual === 1}>
                    <ChevronLeft size={16} />
                </button>

                {paginas.map((n) => (
                    <button
                        key={n}
                        className={n === paginaAtual ? "pag-btn ativo" : "pag-btn"}
                        onClick={() => onMudar(n)}
                    >
                        {n}
                    </button>
                ))}

                <button className="pag-btn" onClick={() => onMudar(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}>
                    <ChevronRight size={16} />
                </button>
                <button className="pag-btn" onClick={() => onMudar(totalPaginas)} disabled={paginaAtual === totalPaginas}>
                    <ChevronsRight size={16} />
                </button>
            </div>
        </>
    );
}

export default Paginacao;