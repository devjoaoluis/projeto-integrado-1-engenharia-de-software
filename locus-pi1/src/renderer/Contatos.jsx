import { useEffect, useState } from "react";
import { mensagemErro } from "./utils/mensagemErro";
import BotaoVoltar from "./components/BotaoVoltar";

const vazio = { name: "", cpfCnpj: "", phone: "", email: "" };

function Contatos() {
  const [aba, setAba] = useState("owners");
  const [registros, setRegistros] = useState([]);
  const [formulario, setFormulario] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const [contatoParaExcluir, setContatoParaExcluir] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [busca, setBusca] = useState("");

  const api = window.api[aba];
  const rotulo = { owners: "Proprietários", guarantors: "Fiadores" }[aba];

  useEffect(() => {
    carregar();
  }, [aba]);

  async function carregar() {
    try {
      setErro("");
      const lista = await api.list();
      setRegistros(lista || []);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar os contatos.");
    }
  }

  function mudar(event) {
    const { name, value } = event.target;
    setFormulario((atual) => ({ ...atual, [name]: value }));
  }

  function editar(contato) {
    setEditando(contato.id);
    setFormulario({
      name: contato.name || "",
      cpfCnpj: contato.cpfCnpj || "",
      phone: contato.phone || "",
      email: contato.email || "",
    });
  }

  function cancelarEdicao() {
    setEditando(null);
    setFormulario(vazio);
  }

  async function salvar(event) {
    event.preventDefault();
    try {
      setErro("");
      const dados = {
        name: formulario.name.trim(),
        cpfCnpj: formulario.cpfCnpj || null,
        phone: formulario.phone || null,
        email: formulario.email || null,
      };
      if (editando) await api.update({ id: editando, ...dados });
      else await api.create(dados);
      cancelarEdicao();
      await carregar();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o contato.");
    }
  }

  async function excluir(id) {
    const contato = registros.find((registro) => registro.id === id);
    if (contato) setContatoParaExcluir(contato);
  }

  async function excluirConfirmado() {
    if (!contatoParaExcluir) return;
    const id = contatoParaExcluir.id;
    setContatoParaExcluir(null);
    setRemovendo(true);
    try {
      setErro("");
      await api.delete(id);
      await carregar();
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível excluir este contato."));
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <>
      <BotaoVoltar destino="/home" texto="Voltar" />
      <style>{`
        .contatos { display: flex; flex-direction: column; gap: 20px; }
        .contatos-abas { display: flex; }
        .contatos-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .contatos-form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: end; }
        .contatos-form label { display: flex; flex-direction: column; gap: 6px; color: #555; font-size: 12px; font-weight: 600; }
        .contatos-form input, .contatos-form select { min-height: 40px; padding: 0 10px; border: 1px solid #c8cdd2; border-radius: 4px; }
        .contatos-form .campo-largo { grid-column: span 2; }
        .contatos-filtro { margin-bottom: 16px; }
        .contatos-filtro label { display: flex; flex-direction: column; gap: 6px; color: #555; font-size: 12px; font-weight: 600; }
        .contatos-filtro input { width: 100%; box-sizing: border-box; min-height: 38px; padding: 0 10px; border: 1px solid #c8cdd2; border-radius: 4px; }
        .contatos-acoes { display: flex; gap: 8px; }
        .contatos-acoes button, .contato-acao { min-height: 38px; padding: 0 14px; border: none; border-radius: 4px; cursor: pointer; background: #1976d2; color: white; font-weight: 600; }
        .contatos-acoes .cancelar, .contato-acao.excluir { background: #e5e7eb; color: #333; }
        .contato-acao.excluir { color: #b42318; }
        .contatos-tabela { width: 100%; border-collapse: collapse; }
        .contatos-tabela th, .contatos-tabela td { padding: 12px 8px; border-bottom: 1px solid #eee; text-align: left; }
        .contatos-tabela th { color: #555; font-size: 13px; }
        .contatos-tabela td { font-size: 14px; }
        .contato-acoes { display: flex; gap: 8px; }
        .contatos-erro { padding: 14px 16px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff5f5; color: #8a1c1c; }
        .confirmacao-exclusao { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.35); }
        .confirmacao-exclusao-conteudo { width: min(420px, calc(100vw - 32px)); padding: 24px; border-radius: 8px; background: white; box-shadow: 0 8px 28px rgba(0,0,0,.2); }
        .confirmacao-exclusao-acoes { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
        .confirmacao-exclusao-acoes button { min-height: 38px; padding: 0 14px; border: 0; border-radius: 4px; cursor: pointer; }
        .confirmacao-excluir { color: white; background: #d32f2f; }
        @media (max-width: 900px) {
          .contatos-form { grid-template-columns: repeat(2, 1fr); }
          .contatos-form .campo-largo { grid-column: span 2; }
          .contatos-tabela { display: block; overflow-x: auto; }
        }
      `}</style>
      <div className="contatos">
        <div className="contatos-abas abas-padrao">
          {Object.entries({ owners: "Proprietários", guarantors: "Fiadores" }).map(([chave, nome]) => (
            <button key={chave} className={`aba-padrao ${aba === chave ? "ativa" : ""}`} onClick={() => { setAba(chave); cancelarEdicao(); }}>
              {nome}
            </button>
          ))}
        </div>
        <section className="contatos-card">
          <h2>{editando ? `Editar ${rotulo.slice(0, -1)}` : `Cadastrar ${rotulo.slice(0, -1)}`}</h2>
          <form className="contatos-form" onSubmit={salvar}>
            <label className="campo-largo ui-label ui-label-required">Nome<input className="ui-control" name="name" value={formulario.name} onChange={mudar} required /></label>
            <label className="ui-label ui-label-optional">CPF/CNPJ<input className="ui-control" name="cpfCnpj" value={formulario.cpfCnpj} onChange={mudar} /></label>
            <label className="ui-label ui-label-optional">Telefone<input className="ui-control" name="phone" value={formulario.phone} onChange={mudar} /></label>
            <label className="ui-label ui-label-optional">E-mail<input className="ui-control" name="email" type="email" value={formulario.email} onChange={mudar} /></label>
            <div className="contatos-acoes">
              <button type="submit">{editando ? "Salvar" : "Cadastrar"}</button>
              {editando && <button className="cancelar" type="button" onClick={cancelarEdicao}>Cancelar</button>}
            </div>
          </form>
          {erro && <div className="contatos-erro" role="alert"><strong>Não foi possível concluir a operação</strong><br />{erro}</div>}
        </section>
        <section className="contatos-card">
          <h2>{rotulo} cadastrados</h2>
          <form className="contatos-filtro" onSubmit={(event) => event.preventDefault()}>
            <label className="ui-label ui-label-optional">Pesquisar por nome, e-mail ou telefone
              <input className="ui-control" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Digite para pesquisar" />
            </label>
          </form>
          {registros.filter((contato) => {
            const termo = busca.trim().toLocaleLowerCase();
            return !termo || [contato.name, contato.email, contato.phone].some((valor) => String(valor || "").toLocaleLowerCase().includes(termo));
          }).length === 0 ? <p>Nenhum contato encontrado.</p> : (
            <table className="contatos-tabela">
              <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead>
              <tbody>
                {registros.filter((contato) => {
                  const termo = busca.trim().toLocaleLowerCase();
                  return !termo || [contato.name, contato.email, contato.phone].some((valor) => String(valor || "").toLocaleLowerCase().includes(termo));
                }).map((contato) => (
                  <tr key={contato.id}>
                    <td>{contato.name}</td><td>{contato.cpfCnpj}</td><td>{contato.phone}</td><td>{contato.email || "—"}</td>
                    <td className="contato-acoes">
                      <button className="contato-acao" onClick={() => editar(contato)}>Editar</button>
                      <button className="contato-acao excluir" disabled={removendo} onClick={() => excluir(contato.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      {contatoParaExcluir && (
        <div className="confirmacao-exclusao" role="dialog" aria-modal="true">
          <div className="confirmacao-exclusao-conteudo">
            <h2>Excluir cadastro?</h2>
            <p>Deseja excluir <strong>{contatoParaExcluir.name}</strong>? Essa ação não poderá ser desfeita.</p>
            <div className="confirmacao-exclusao-acoes">
              <button type="button" onClick={() => setContatoParaExcluir(null)}>Cancelar</button>
              <button type="button" className="confirmacao-excluir" onClick={excluirConfirmado}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Contatos;
