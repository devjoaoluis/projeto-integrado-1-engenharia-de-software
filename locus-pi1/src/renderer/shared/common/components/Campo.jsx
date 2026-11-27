import { useId } from "react";

function Campo({
    label,
    opcoes,
    multilinha = false,
    required = false,
    placeholder,
    id,
    className = "",
    ...props
}) {
    const generatedId = useId();
    const controlId = id || generatedId;
    const textoPlaceholder = placeholder || (required ? "" : "Opcional");

    return (
        <div className={`campo-form ${className}`.trim()}>
            <label className="campo-form-label" htmlFor={controlId}>
                    {label}{required ? " *" : " (Opcional)"}
            </label>
            {opcoes ? (
                    <select
                        id={controlId}
                        className="campo-form-controle"
                        required={required}
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
                        id={controlId}
                        className="campo-form-controle"
                        rows={1}
                        required={required}
                        placeholder={textoPlaceholder}
                        {...props}
                    />
                ) : (
                    <input
                        id={controlId}
                        className="campo-form-controle"
                        required={required}
                        placeholder={textoPlaceholder}
                        {...props}
                    />
                )}
        </div>
    );
}

export default Campo;