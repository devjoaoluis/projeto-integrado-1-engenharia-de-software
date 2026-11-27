function Campo({ label, opcoes, multilinha = false, ...props }) {
    return (
        <>
            <style>
                {`
                    .campo-form {
                        position: relative;
                    }

                    .campo-form-label {
                        position: absolute;
                        top: -8px;
                        left: 12px;
                        padding: 0 4px;
                        background-color: white;
                        font-size: 12px;
                        color: #666666;
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

                    .campo-form:focus-within .campo-form-label {
                        color: #1976d2;
                    }
                `}
            </style>

            <div className="campo-form">
                <label className="campo-form-label">{label}</label>

                {opcoes ? (
                    <select className="campo-form-controle" {...props}>
                        <option value=""></option>
                        {opcoes.map((opcao) => (
                            <option key={opcao} value={opcao}>
                                {opcao}
                            </option>
                        ))}
                    </select>
                ) : multilinha ? (
                    <textarea className="campo-form-controle" rows={1} {...props} />
                ) : (
                    <input className="campo-form-controle" {...props} />
                )}
            </div>
        </>
    );
}

export default Campo;