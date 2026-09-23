
function Button({ texto }) {
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

                    .button:hover {
                        background-color: #1565c0;
                    }
                `}
            </style>

            <button
                className="button"
                type="submit"
            >
                {texto}
            </button>
        </>
    );
}

export default Button;