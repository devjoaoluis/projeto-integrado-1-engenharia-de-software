import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "./Input";
import Button from "./Button";

export default function Register({ onSuccess }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const response = await window.api.auth.register({ nome, email, senha });

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
            background-color: #1976d2;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            font-family: sans-serif;
          }

          .register-title {
            color: white;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 24px;
            text-align: center;
          }

          .register-card {
            background-color: white;
            border-radius: 8px;
            padding: 32px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            box-sizing: border-box;
          }

          .register-card h2 {
            font-size: 22px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #333;
          }

          .register-card p {
            font-size: 14px;
            color: #666;
            margin: 0 0 20px 0;
          }

          .error-message {
            color: #d32f2f;
            background-color: #fde8e8;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 16px;
            border: 1px solid #f8b4b4;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
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
                required
              />

              <Input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repetir Senha"
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