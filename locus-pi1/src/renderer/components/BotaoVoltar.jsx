import { useNavigate } from "react-router-dom";

function BotaoVoltar({ destino = "/home", texto = "Voltar" }) {
  const navigate = useNavigate();

  function voltar() {
    if (window.history.length > 1) navigate(-1);
    else navigate(destino);
  }

  return (
    <button type="button" className="botao-voltar-padrao" onClick={voltar}>
      ← {texto}
    </button>
  );
}

export default BotaoVoltar;
