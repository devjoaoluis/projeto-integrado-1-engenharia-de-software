import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../Input";
import Button from "../Button";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBuscarPergunta(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      if (!window.api) return;

      const res = await window.api.auth.getSecurityQuestion(email.trim());
      if (res.success) {
        setPergunta(res.pergunta);
        setStep(2);
      } else {
        setErro(res.error || "E-mail não encontrado.");
      }
    } catch (err) {
      setErro(err.message || "Erro ao buscar pergunta de segurança.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedefinirSenha(e) {
    e.preventDefault();
    setErro("");

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (!window.api) return;

    setLoading(true);
    try {
      const res = await window.api.auth.resetPassword({
        email: email.trim(),
        respostaSeguranca: resposta.trim(),
        novaSenha,
      });

      if (res.success) {
        setSucesso("Senha redefinida com sucesso! Redirecionando para o login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setErro(res.error || "Resposta incorreta.");
      }
    } catch (err) {
      setErro(err.message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .forgot-page {
            margin: 0;
            background-color: #1976d2;
            font-family: Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .forgot-container {
            width: 100%;
            max-width: 440px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .bem-vindo {
            font-size: 26px;
            font-weight: bold;
            color: #ffffff;
            margin: 0 0 20px 0;
            text-align: center;
          }

          .card-forgot {
            width: 100%;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
            padding: 32px;
            text-align: left;
          }

          .titulo-card {
            font-size: 22px;
            font-weight: 600;
            color: #1e293b;
            margin: 0 0 6px 0;
          }

          .subtitulo-card {
            font-size: 14px;
            color: #64748b;
            margin: 0 0 20px 0;
            line-height: 1.4;
          }

          .mensagem-erro {
            color: #b91c1c;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 10px 14px;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 16px;
          }

          .mensagem-sucesso {
            color: #15803d;
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 10px 14px;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 16px;
          }

          .campo {
            margin-bottom: 16px;
          }

          .rotulo {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 6px;
          }

          .dica {
            display: block;
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }

          .caixa-pergunta {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #1976d2;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 18px;
          }

          .pergunta-badge {
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: #1976d2;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .pergunta-texto {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #0f172a;
          }

          .botao-voltar-recuperacao {
            display: block;
            margin: 20px auto 0;
            padding: 0;
            border: none;
            background: none;
            color: #1976d2;
            cursor: pointer;
            font-size: 14px;
            text-decoration: underline;
          }

          .botao-voltar-recuperacao:hover {
            color: #125aa3;
          }

        `}
      </style>

      <div className="forgot-page">
        <div className="forgot-container">
          <h1 className="bem-vindo">Locus Marismar</h1>

          <div className="card-forgot">
            <h2 className="titulo-card">Recuperar Senha</h2>
            <p className="subtitulo-card">
              {step === 1
                ? "Informe seu e-mail para localizar sua pergunta de segurança."
                : "Responda à sua pergunta de segurança para cadastrar uma nova senha."}
            </p>

            {erro && <div className="mensagem-erro">{erro}</div>}
            {sucesso && <div className="mensagem-sucesso">{sucesso}</div>}

            {step === 1 && (
              <form onSubmit={handleBuscarPergunta}>
                <div className="campo">
                  <label className="rotulo">E-mail</label>
                  <Input
                    type="email"
                    placeholder="exemplo@locus.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  texto={loading ? "Buscando pergunta..." : "Continuar"}
                  disabled={loading}
                />
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleRedefinirSenha}>
                <div className="caixa-pergunta">
                  <span className="pergunta-badge">Pergunta de Segurança</span>
                  <p className="pergunta-texto">{pergunta}</p>
                </div>

                <div className="campo">
                  <label className="rotulo">Sua Resposta</label>
                  <Input
                    type="text"
                    placeholder="Digite sua resposta de segurança"
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="campo">
                  <label className="rotulo">Nova Senha</label>
                  <Input
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <span className="dica">A senha deve ter no mínimo 6 caracteres.</span>
                </div>

                <Button
                  texto={loading ? "Redefinindo senha..." : "Redefinir Senha"}
                  disabled={loading}
                />
              </form>
            )}

            <button
              type="button"
              className="botao-voltar-recuperacao"
              onClick={() => navigate("/login")}
            >
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}