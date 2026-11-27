import Input from "./Input";
import Button from "./Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FormLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState(() => localStorage.getItem("locus:login-email") || "");
    const [senha, setSenha] = useState("");
    const [lembrarEmail, setLembrarEmail] = useState(() => Boolean(localStorage.getItem("locus:login-email")));
    const [erro, setErro] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setErro("");

        if (!window.api?.auth?.login) {
            setErro("Não foi possível conectar ao serviço de autenticação.");
            return;
        }

        try {
            const res = await window.api.auth.login({ 
                email: email.trim(), 
                senha 
            });
            
            if (!res.success) {
                setErro("Senha incorreta");
                return;
            }
        } catch (error) {
            console.error("Não foi possível autenticar:", error);
            setErro("Não foi possível realizar o login. Tente novamente.");
            return;
        }

        if (lembrarEmail) {
            localStorage.setItem("locus:login-email", email.trim());
        } else {
            localStorage.removeItem("locus:login-email");
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
                        background-color: var(--color-primary);
                        font-family: var(--font-family-base);

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
                        font-size: var(--font-headline-md);
                        font-weight: bold;
                        color: var(--color-on-primary);
                        margin-bottom: 24px;
                    }

                    .login {
                        width: 100%;
                        padding: var(--space-6);
                        background-color: var(--color-surface);
                        border-radius: var(--radius-sm);
                        box-shadow: var(--elevation-2);
                        text-align: left;
                    }

                    .titulo {
                        font-size: var(--font-title-lg);
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
                        color: var(--color-primary);
                        text-decoration: none;
                        cursor: pointer;
                    }

                    .esqueci-senha:hover {
                        text-decoration: underline;
                    }

                    .erro-login {
                        color: var(--color-error);
                        font-size: var(--font-body-md);
                        margin-bottom: 14px;
                    }

                    .lembrar-email {
                        display: flex;
                        align-items: center;
                        gap: var(--space-2);
                        margin: var(--space-1) 0 var(--space-3);
                        color: var(--color-on-surface);
                        font-size: var(--font-body-md);
                    }

                    .lembrar-email input {
                        width: 16px;
                        height: 16px;
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

                        <label className="lembrar-email">
                            <input
                                type="checkbox"
                                checked={lembrarEmail}
                                onChange={(e) => setLembrarEmail(e.target.checked)}
                            />
                            Lembrar do email
                        </label>

                        <a
                            className="esqueci-senha"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/forgot-password");
                            }}
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