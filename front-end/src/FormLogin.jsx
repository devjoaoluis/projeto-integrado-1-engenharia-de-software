
import Input from "./Input";
import Button from "./Button";

function FormLogin() {
    return (
        <>
            <style>
                {`
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        background-color: #1976d2;
                        font-family: Arial, sans-serif;

                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }

                    .form-container {
                        width: 760px;
                        max-width: 90%;
                        text-align: center;
                    }

                    .bem-vindo {
                        font-size: 28px;
                        font-weight: bold;
                        color: white;
                        margin-bottom: 24px;
                    }

                    .login {
                        width: 100%;
                        padding: 32px;
                        background-color: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        text-align: left;
                    }

                    .titulo {
                        font-size: 20px;
                        font-weight: normal;
                        margin-top: 0;
                        margin-bottom: 28px;
                    }

                    .campo {
                        margin-bottom: 14px;
                    }

                    .esqueci-senha {
                        display: block;
                        margin-bottom: 14px;
                        color: #1976d2;
                    }
                `}
            </style>

            <div className="form-container">

                <h1 className="bem-vindo">
                    Bem-vindo à Locus Marismar
                </h1>

                <div className="login">

                    <h2 className="titulo">Login</h2>

                    <div className="campo">
                        <Input
                            type="email"
                            placeholder="Email"
                        />
                    </div>

                    <div className="campo">
                        <Input
                            type="password"
                            placeholder="Senha"
                        />
                    </div>

                    <a
                        className="esqueci-senha"
                        href="#"
                    >
                        Esqueci minha senha
                    </a>

                    <Button texto="Entrar" />

                </div>

            </div>
        </>
    );
}

export default FormLogin;