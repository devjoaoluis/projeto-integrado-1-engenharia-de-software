import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

function Paginacao({ paginaAtual, totalPaginas, onMudar }) {
    const inicio = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4));
    const paginas = Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => inicio + i);

    return (
        <>
            <style>
                {`
                    .paginacao {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: var(--space-3);
                        margin-top: 24px;
                    }

                    .pag-btn {
                        width: 28px;
                        height: 28px;
                        border: none;
                        border-radius: var(--radius-full);
                        background-color: transparent;
                        color: var(--color-on-surface);
                        font-size: var(--font-body-md);
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
                        background-color: var(--color-primary);
                        color: var(--color-on-primary);
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