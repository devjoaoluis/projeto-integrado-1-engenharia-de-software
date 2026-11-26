import Input from "./Input";
import Button from "./Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FormLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setErro("");

        if (senha.length < 6) {
            setErro("A senha deve ter no mínimo 6 caracteres.");
                return;
    }

        if (window.api) {
            const res = await window.api.auth.login({ email, senha });
            if (!res.success) {
                setErro(res.error || "Email ou senha inválidos.");
                return;
            }
        }

        navigate("/home");
    }

    return (
        <>
            <style>
                {`
                    * {
                        box-sizing: border-box;
                    }

                    .login-page {
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

                    .erro-login {
                        color: #d32f2f;
                        font-size: 14px;
                        margin-bottom: 14px;
                    }
                `}
            </style>

            <div className="login-page">
                <div className="form-container">

                    <h1 className="bem-vindo">
                        Bem-vindo à Locus Marismar
                    </h1>

                    <form className="login" onSubmit={handleSubmit}>

                        <h2 className="titulo">Login</h2>

                        <div className="campo">
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="campo">
                            <Input
                                type="password"
                                placeholder="Senha"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                required
                            />
                        </div>

                        <a
                            className="esqueci-senha"
                            href="#/login"
                        >
                            Esqueci minha senha
                        </a>

                        {erro && <p className="erro-login">{erro}</p>}

                        <Button texto="Entrar" />

                    </form>

                </div>
            </div>
        </>
    );
}

export default FormLogin;