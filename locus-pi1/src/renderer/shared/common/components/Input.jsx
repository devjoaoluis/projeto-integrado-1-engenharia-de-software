function Input({ className = "", ...props }) {
    return <input className={`input ui-input ${className}`.trim()} {...props} />;
}

export default Input;