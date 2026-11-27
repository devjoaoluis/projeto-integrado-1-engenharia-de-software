import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "./Input";
import Button from "./Button";

export default function Register({ onSuccess }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [repetirSenha, setRepetirSenha] = useState("");
  const [perguntaSeguranca, setPerguntaSeguranca] = useState("");
  const [respostaSeguranca, setRespostaSeguranca] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (senha !== repetirSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await window.api.auth.register({
        nome,
        email,
        senha,
        perguntaSeguranca,
        respostaSeguranca,
      });

      if (response.success) {
        onSuccess();
        navigate("/login", { replace: true });
      } else {
        setError(response.error || "Erro ao realizar o cadastro.");
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>
        {`
          .register-container {
            min-height: 100vh;
            background-color: var(--color-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-4);
            box-sizing: border-box;
            font-family: var(--font-family-base);
          }

          .register-title {
            color: var(--color-on-primary);
            font-size: var(--font-headline-md);
            font-weight: bold;
            margin-bottom: 24px;
            text-align: center;
          }

          .register-card {
            background-color: var(--color-surface);
            border-radius: var(--radius-sm);
            padding: var(--space-6);
            width: 100%;
            max-width: 400px;
            box-shadow: var(--elevation-2);
            box-sizing: border-box;
          }

          .register-card h2 {
            font-size: var(--font-title-lg);
            font-weight: 600;
            margin: 0 0 var(--space-2) 0;
            color: var(--color-on-surface);
          }

          .register-card p {
            font-size: var(--font-body-md);
            color: var(--color-on-surface-variant);
            margin: 0 0 var(--space-4) 0;
          }

          .error-message {
            color: var(--color-error);
            background-color: var(--color-error-container);
            padding: var(--space-2);
            border-radius: var(--radius-xs);
            font-size: var(--font-body-md);
            margin-bottom: 16px;
            border: 1px solid var(--color-error);
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
            margin-bottom: 20px;
          }
        `}
      </style>

      <div className="register-container">
        <h1 className="register-title">Bem-vindo à Locus Marismar</h1>

        <div className="register-card">
          <h2>Primeiro Acesso</h2>
          <p>Cadastre a conta principal para acessar o sistema.</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <Input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                required
              />

              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                required
              />

              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                minLength={6}
                required
              />
              <span style={{ color: "var(--color-on-surface-variant)", fontSize: "var(--font-body-sm)", marginTop: "calc(-1 * var(--space-2))" }}>
                A senha deve ter pelo menos 6 caracteres.
              </span>

              <Input
                type="password"
                value={repetirSenha}
                onChange={(e) => setRepetirSenha(e.target.value)}
                placeholder="Repetir Senha"
                required
              />

              <Input
                type="text"
                value={perguntaSeguranca}
                onChange={(e) => setPerguntaSeguranca(e.target.value)}
                placeholder="Pergunta de segurança (ex: Qual seu primeiro pet?)"
                required
              />

              <Input
                type="text"
                value={respostaSeguranca}
                onChange={(e) => setRespostaSeguranca(e.target.value)}
                placeholder="Resposta de segurança"
                required
              />
            </div>

            <Button
              texto={loading ? "Cadastrando..." : "Criar Conta"}
              disabled={loading}
            />
          </form>
        </div>
      </div>
    </>
  );
}