function Input(props) {
    return (
        <>
            <style>
                {`
                    .input {
                        width: 100%;
                        height: 46px;
                        padding: 10px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        font-size: 14px;
                    }

                    .input:focus {
                        outline: none;
                        border-color: #1976d2;
                    }
                `}
            </style>

            <input className="input" {...props} />
        </>
    );
}

export default Input;