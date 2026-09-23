function Button({ texto, ...props }) {
    return (
        <>
            <style>
                {`
                    .button {
                        width: 100%;
                        height: 46px;
                        background-color: #1976d2;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    }

                    .button:hover:not(:disabled) {
                        background-color: #1565c0;
                    }

                    .button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                    }
                `}
            </style>

            <button className="button" type="submit" {...props}>
                {texto}
            </button>
        </>
    );
}

export default Button;