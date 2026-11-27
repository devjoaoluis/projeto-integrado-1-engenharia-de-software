function Badge({ texto, cor = "cinza" }) {
    return (
        <>
            <style>
                {`
                    .badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 999px;
                        font-size: 12px;
                    }

                    .badge-verde {
                        background-color: #e6f9ec;
                        color: #2e9e5b;
                    }

                    .badge-vermelho {
                        background-color: #fdeaea;
                        color: #d32f2f;
                    }

                    .badge-cinza {
                        background-color: #f0f0f0;
                        color: #333333;
                    }
                `}
            </style>

            <span className={`badge badge-${cor}`}>{texto}</span>
        </>
    );
}

export default Badge;