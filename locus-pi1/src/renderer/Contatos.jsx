import { useEffect, useState } from "react";
import { mensagemErro } from "./utils/mensagemErro";

const vazio = { name: "", cpfCnpj: "", phone: "", email: "", type: "TENANT", guarantorId: "" };

function Contatos() {
  const [aba, setAba] = useState("clients");
  const [registros, setRegistros] = useState([]);
  const [fiadores, setFiadores] = useState([]);
  const fiadorPorId = Object.fromEntries(fiadores.map((fiador) => [fiador.id, fiador.name]));
  const [formulario, setFormulario] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const [contatoParaRemover, setContatoParaRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);

  const api = aba === "clients" ? window.api.clients : window.api[aba];
  const rotulo = { clients: "Clientes / Locatários", owners: "Proprietários", guarantors: "Fiadores" }[aba];

  useEffect(() => {
    carregar();
  }, [aba]);

  async function carregar() {
    try {
      setErro("");
      const [lista, listaFiadores] = await Promise.all([
        api.list(),
        window.api.guarantors.list(),
      ]);
      setRegistros(lista || []);
      setFiadores(listaFiadores || []);
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
      type: contato.type || "TENANT",
      guarantorId: contato.guarantorId || "",
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
        name: formulario.name,
        cpfCnpj: formulario.cpfCnpj,
        phone: formulario.phone,
        email: formulario.email || null,
      };
      if (aba === "clients") {
        dados.type = formulario.type;
        dados.guarantorId = formulario.guarantorId || null;
      }
      if (editando) await api.update({ id: editando, ...dados });
      else await api.create(dados);
      cancelarEdicao();
      await carregar();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o contato.");
    }
  }

  async function remover(id) {
    const contato = registros.find((registro) => registro.id === id);
    if (contato) setContatoParaRemover(contato);
  }

  async function confirmarRemocao() {
    if (!contatoParaRemover) return;
    const id = contatoParaRemover.id;
    setContatoParaRemover(null);
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
      <style>{`
        .contatos { display: flex; flex-direction: column; gap: 20px; }
        .contatos-abas { display: flex; gap: 8px; border-bottom: 2px solid #e5e7eb; }
        .contatos-abas button { padding: 12px 16px; border: none; background: none; cursor: pointer; font-weight: 600; color: #666; }
        .contatos-abas button.ativa { color: #1976d2; border-bottom: 3px solid #1976d2; }
        .contatos-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .contatos-form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: end; }
        .contatos-form label { display: flex; flex-direction: column; gap: 6px; color: #555; font-size: 12px; font-weight: 600; }
        .contatos-form input, .contatos-form select { min-height: 40px; padding: 0 10px; border: 1px solid #c8cdd2; border-radius: 4px; }
        .contatos-form .campo-largo { grid-column: span 2; }
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
        <div className="contatos-abas">
          {Object.entries({ clients: "Clientes / Locatários", owners: "Proprietários", guarantors: "Fiadores" }).map(([chave, nome]) => (
            <button key={chave} className={aba === chave ? "ativa" : ""} onClick={() => { setAba(chave); cancelarEdicao(); }}>
              {nome}
            </button>
          ))}
        </div>
        <section className="contatos-card">
          <h2>{editando ? `Editar ${rotulo.slice(0, -1)}` : `Cadastrar ${rotulo.slice(0, -1)}`}</h2>
          <form className="contatos-form" onSubmit={salvar}>
            <label className="campo-largo">Nome<input name="name" value={formulario.name} onChange={mudar} required /></label>
            <label>CPF/CNPJ<input name="cpfCnpj" value={formulario.cpfCnpj} onChange={mudar} required /></label>
            <label>Telefone<input name="phone" value={formulario.phone} onChange={mudar} required /></label>
            <label>E-mail<input name="email" type="email" value={formulario.email} onChange={mudar} /></label>
            {aba === "clients" && (
              <>
                <label>Perfil
                  <select name="type" value={formulario.type} onChange={mudar}>
                    <option value="TENANT">Locatário</option>
                    <option value="INTERESTED">Interessado</option>
                  </select>
                </label>
                <label>Fiador
                  <select name="guarantorId" value={formulario.guarantorId} onChange={mudar}>
                    <option value="">Sem fiador</option>
                    {fiadores.map((fiador) => <option key={fiador.id} value={fiador.id}>{fiador.name}</option>)}
                  </select>
                </label>
              </>
            )}
            <div className="contatos-acoes">
              <button type="submit">{editando ? "Salvar" : "Cadastrar"}</button>
              {editando && <button className="cancelar" type="button" onClick={cancelarEdicao}>Cancelar</button>}
            </div>
          </form>
          {erro && <div className="contatos-erro" role="alert"><strong>Não foi possível concluir a exclusão</strong><br />{erro}</div>}
        </section>
        <section className="contatos-card">
          <h2>{rotulo} cadastrados</h2>
          {registros.length === 0 ? <p>Nenhum contato cadastrado.</p> : (
            <table className="contatos-tabela">
              <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>E-mail</th>{aba === "clients" && <><th>Perfil</th><th>Fiador</th></>}<th>Ações</th></tr></thead>
              <tbody>
                {registros.map((contato) => (
                  <tr key={contato.id}>
                    <td>{contato.name}</td><td>{contato.cpfCnpj}</td><td>{contato.phone}</td><td>{contato.email || "—"}</td>
                    {aba === "clients" && <><td>{contato.type === "TENANT" ? "Locatário" : "Interessado"}</td><td>{contato.guarantorId ? (fiadorPorId[contato.guarantorId] || "Fiador não encontrado") : "Sem fiador"}</td></>}
                    <td className="contato-acoes">
                      <button className="contato-acao" onClick={() => editar(contato)}>Editar</button>
                      <button className="contato-acao excluir" disabled={removendo} onClick={() => remover(contato.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      {contatoParaRemover && (
        <div className="confirmacao-exclusao" role="dialog" aria-modal="true">
          <div className="confirmacao-exclusao-conteudo">
            <h2>Excluir cadastro?</h2>
            <p>Deseja excluir <strong>{contatoParaRemover.name}</strong>? Essa ação não poderá ser desfeita.</p>
            <div className="confirmacao-exclusao-acoes">
              <button type="button" onClick={() => setContatoParaRemover(null)}>Cancelar</button>
              <button type="button" className="confirmacao-excluir" onClick={confirmarRemocao}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Contatos;
