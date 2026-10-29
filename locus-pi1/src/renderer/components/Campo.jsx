function Campo({ label, opcoes, multilinha = false, required = false, placeholder, ...props }) {
    const textoPlaceholder = placeholder || (required ? "Obrigatório" : "Opcional");

    return (
        <>
            <style>
                {`
                    .campo-form {
                        width: 100%;
                    }

                    .campo-form-label {
                        display: block;
                        margin: 0 0 6px;
                        color: #555;
                        font-size: 13px;
                        font-weight: 600;
                    }

                    .campo-form-controle {
                        width: 100%;
                        min-height: 54px;
                        padding: 0 14px;
                        border: 1px solid #b0b0b0;
                        border-radius: 4px;
                        background-color: white;
                        font-size: 14px;
                    }

                    textarea.campo-form-controle {
                        padding: 16px 14px;
                        resize: vertical;
                    }

                    .campo-form-controle:focus {
                        outline: none;
                        border: 2px solid #1976d2;
                    }

                `}
            </style>

            <div className="campo-form">
                <label className="campo-form-label">
                    {label}{required ? " *" : ""}
                </label>
                {opcoes ? (
                    <select
                        className="campo-form-controle"
                        required={required}
                        aria-label={label}
                        {...props}
                    >
                        <option value="" disabled={required}>
                            {textoPlaceholder}
                        </option>
                        {opcoes.map((opcao) => (
                            <option
                                key={typeof opcao === "string" ? opcao : opcao.value}
                                value={typeof opcao === "string" ? opcao : opcao.value}
                            >
                                {typeof opcao === "string" ? opcao : opcao.label}
                            </option>
                        ))}
                    </select>
                ) : multilinha ? (
                    <textarea
                        className="campo-form-controle"
                        rows={1}
                        required={required}
                        aria-label={label}
                        placeholder={textoPlaceholder}
                        {...props}
                    />
                ) : (
                    <input
                        className="campo-form-controle"
                        required={required}
                        aria-label={label}
                        placeholder={textoPlaceholder}
                        {...props}
                    />
                )}
            </div>
        </>
    );
}

export default Campo;