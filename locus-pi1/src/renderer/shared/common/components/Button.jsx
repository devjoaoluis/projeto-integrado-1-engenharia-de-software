function Button({ texto, variant = "filled", className = "", type = "submit", ...props }) {
    return (
        <button
            className={`button ui-button ui-button--${variant} ${className}`.trim()}
            type={type}
            {...props}
        >
            {texto}
        </button>
    );
}

export default Button;