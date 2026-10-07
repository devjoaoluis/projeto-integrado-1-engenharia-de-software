import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function handleBuscarPergunta(e) {
    e.preventDefault();
    setErro("");

    if (!window.api) return;

    const res = await window.api.auth.getSecurityQuestion(email.trim());
    if (res.success) {
      setPergunta(res.pergunta);
      setStep(2);
    } else {
      setErro(res.error || "E-mail não encontrado.");
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
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#1976d2", fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: "400px", padding: "32px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginTop: 0, marginBottom: "24px", fontSize: "20px" }}>Recuperar Senha</h2>

        {erro && <p style={{ color: "#d32f2f", fontSize: "14px" }}>{erro}</p>}
        {sucesso && <p style={{ color: "#2e7d32", fontSize: "14px" }}>{sucesso}</p>}

        {step === 1 && (
          <form onSubmit={handleBuscarPergunta}>
            <div style={{ marginBottom: "14px" }}>
              <input
                type="email"
                placeholder="Informe seu E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
            </div>
            <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Buscar Pergunta
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleRedefinirSenha}>
            <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px" }}>
              Pergunta: {pergunta}
            </p>
            <div style={{ marginBottom: "14px" }}>
              <input
                type="text"
                placeholder="Sua Resposta"
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <input
                type="password"
                placeholder="Nova Senha (mín. 6 caracteres)"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
            </div>
            <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Redefinir Senha
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate("/login")}
          style={{ background: "none", border: "none", color: "#1976d2", cursor: "pointer", marginTop: "16px", padding: 0, textDecoration: "underline", fontSize: "14px" }}
        >
          Voltar ao Login
        </button>
      </div>
    </div>
  );
}