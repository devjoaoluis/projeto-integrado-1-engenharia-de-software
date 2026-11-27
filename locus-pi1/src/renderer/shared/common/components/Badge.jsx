function Badge({ texto, cor = "cinza" }) {
    const variantes = {
        verde: "success",
        vermelho: "error",
        amarelo: "warning",
        cinza: "neutral",
    };
    const variante = variantes[cor] || "neutral";

    return <span className={`badge ui-badge ui-badge--${variante}`}>{texto}</span>;
}

export default Badge;