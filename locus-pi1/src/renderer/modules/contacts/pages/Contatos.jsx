import { useEffect, useState } from "react";
import { mensagemErro } from "../../../shared/common/utils/mensagemErro";
import BotaoVoltar from "../../../shared/common/components/BotaoVoltar";

const vazio = { name: "", cpfCnpj: "", phone: "", email: "" };

function Contatos() {
  const [aba, setAba] = useState("owners");
  const [registros, setRegistros] = useState([]);
  const [formulario, setFormulario] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const [contatoParaExcluir, setContatoParaExcluir] = useState(null);
  const [proprietarioParaRepasse, setProprietarioParaRepasse] = useState(null);
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
        .contatos { display: flex; flex-direction: column; gap: var(--space-4); }
        .contatos-abas { display: flex; }
        .contatos-card { background: var(--color-surface); padding: var(--space-4); border-radius: var(--radius-md); box-shadow: var(--elevation-2); }
        .contatos-form { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); align-items: end; }
        .contatos-form label { display: flex; flex-direction: column; gap: var(--space-1); color: var(--color-on-surface-variant); font-size: var(--font-body-sm); font-weight: 600; }
        .contatos-form input, .contatos-form select { min-height: 40px; padding: 0 var(--space-2); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-xs); }
        .contatos-form .campo-largo { grid-column: span 2; }
        .contatos-filtro { margin-bottom: 16px; }
        .contatos-filtro label { display: flex; flex-direction: column; gap: var(--space-1); color: var(--color-on-surface-variant); font-size: var(--font-body-sm); font-weight: 600; }
        .contatos-filtro input { width: 100%; box-sizing: border-box; min-height: 38px; padding: 0 var(--space-2); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-xs); }
        .contatos-acoes { display: flex; gap: var(--space-2); }
        .contato-acao { white-space: nowrap; flex-shrink: 0; }
        .contatos-tabela { width: 100%; border-collapse: collapse; }
        .contatos-tabela th, .contatos-tabela td { padding: var(--space-3) var(--space-2); border-bottom: 1px solid var(--color-outline-variant); text-align: left; }
        .contatos-tabela th { color: var(--color-on-surface); font-size: var(--font-body-md); }
        .contatos-tabela td { font-size: var(--font-body-md); }
        .contato-acoes { display: flex; gap: var(--space-2); }
        .contatos-erro { padding: var(--space-3) var(--space-4); border: 1px solid var(--color-error); border-radius: var(--radius-sm); background: var(--color-error-container); color: var(--color-error); }
        .confirmacao-exclusao { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; background: var(--color-scrim); }
        .confirmacao-exclusao-conteudo { width: min(420px, calc(100vw - 32px)); padding: var(--space-5); border-radius: var(--radius-sm); background: var(--color-surface); box-shadow: var(--elevation-2); }
        .confirmacao-exclusao-acoes { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: 20px; }
        .confirmacao-exclusao-acoes button { min-height: 38px; padding: 0 var(--space-3); border: 0; border-radius: var(--radius-xs); cursor: pointer; }
        .confirmacao-excluir { color: var(--color-on-primary); background: var(--color-error); }
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
              <button className="ui-action ui-action--primary ui-action--large" type="submit">{editando ? "Salvar" : "Cadastrar"}</button>
              {editando && <button className="ui-action ui-action--neutral ui-action--large" type="button" onClick={cancelarEdicao}>Cancelar</button>}
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
                      {aba === "owners" && (
                        <button type="button" className="contato-acao ui-action ui-action--positive" onClick={() => setProprietarioParaRepasse(contato)}>
                          Gerar Repasse
                        </button>
                      )}
                      <button className="contato-acao ui-action ui-action--primary" onClick={() => editar(contato)}>Editar</button>
                      <button className="contato-acao ui-action ui-action--destructive" disabled={removendo} onClick={() => excluir(contato.id)}>Excluir</button>
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
              <button className="ui-action ui-action--neutral" type="button" onClick={() => setContatoParaExcluir(null)}>Cancelar</button>
              <button className="ui-action ui-action--destructive" type="button" onClick={excluirConfirmado}>Excluir</button>
            </div>
          </div>
        </div>
      )}
      {proprietarioParaRepasse && (
        <ModalRepasse
          proprietario={proprietarioParaRepasse}
          onClose={() => setProprietarioParaRepasse(null)}
        />
      )}
    </>
  );
}

function ModalRepasse({ proprietario, onClose }) {
  const [mesAno, setMesAno] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [taxaAdm, setTaxaAdm] = useState(10);
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregarRelatorio = async () => {
    try {
      setCarregando(true);
      setErro("");
      const res = await window.api.owners.getPayoutReport({
        ownerId: proprietario.id,
        referenceMonth: mesAno,
        adminFeePercent: Number(taxaAdm) || 10,
      });
      setRelatorio(res);
    } catch (e) {
      setErro(e.message || "Erro ao consultar repasse.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, [proprietario, mesAno, taxaAdm]);

  const exportarPdf = async () => {
    try {
      setExportando(true);
      setErro("");
      setSucesso("");
      const res = await window.api.owners.exportPayoutPdf({
        ownerId: proprietario.id,
        referenceMonth: mesAno,
        adminFeePercent: Number(taxaAdm) || 10,
      });
      if (res && res.filePath) {
        setSucesso(`Relatório PDF salvo com sucesso em: ${res.filePath}`);
      }
    } catch (e) {
      setErro(e.message || "Erro ao exportar PDF.");
    } finally {
      setExportando(false);
    }
  };

  const formatarMoeda = (val) => {
    return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-scrim)", backdropFilter: "blur(2px)", fontFamily: "var(--font-family-base)"
    }} role="dialog" aria-modal="true">
      <div style={{
        background: "var(--color-surface)", width: "min(720px, calc(100vw - 32px))", maxHeight: "90vh", borderRadius: "var(--radius-md)",
        boxShadow: "var(--elevation-4)", display: "flex", flexDirection: "column", overflow: "hidden"
      }}>
        <div style={{ padding: "var(--space-4) var(--space-4)", background: "var(--color-primary)", color: "var(--color-on-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "var(--font-body-lg)", margin: 0, fontWeight: 700 }}>Relatório de Repasse ao Proprietário (RF18)</h2>
            <span style={{ fontSize: "var(--font-body-sm)", opacity: 0.85 }}>Prestação de contas: {proprietario.name}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--color-on-primary)", fontSize: "var(--font-title-lg)", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "var(--space-4)", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", fontSize: "var(--font-body-sm)", fontWeight: 600, color: "var(--color-on-surface-variant)" }}>
              Competência (MM/AAAA)
              <input
                type="text"
                value={mesAno}
                onChange={(e) => setMesAno(e.target.value)}
                placeholder="Ex: 03/2026"
                style={{ padding: "var(--space-2) var(--space-2)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", fontSize: "var(--font-body-sm)", fontWeight: 600, color: "var(--color-on-surface-variant)" }}>
              Taxa de Administração (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxaAdm}
                onChange={(e) => setTaxaAdm(e.target.value)}
                style={{ padding: "var(--space-2) var(--space-2)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-md)" }}
              />
            </label>
          </div>

          {erro && (
            <div style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-error-container)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-sm)", color: "var(--color-error)", fontSize: "var(--font-body-md)" }}>
              {erro}
            </div>
          )}

          {sucesso && (
            <div style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-success-container)", border: "1px solid var(--color-success)", borderRadius: "var(--radius-sm)", color: "var(--color-success)", fontSize: "var(--font-body-md)" }}>
              {sucesso}
            </div>
          )}

          {carregando ? (
            <p style={{ textAlign: "center", color: "var(--color-on-surface)", padding: "var(--space-4)" }}>Calculando repasse...</p>
          ) : relatorio ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
                <div style={{ padding: "var(--space-3)", background: "var(--color-success-container)", border: "1px solid var(--color-success)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "var(--font-body-sm)", fontWeight: 700, color: "var(--color-success)" }}>TOTAL RECEBIDO</div>
                  <div style={{ fontSize: "var(--font-title-lg)", fontWeight: 700, color: "var(--color-success)", marginTop: "var(--space-1)" }}>{formatarMoeda(relatorio.totalGrossAmount)}</div>
                </div>
                <div style={{ padding: "var(--space-3)", background: "var(--color-warning-container)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "var(--font-body-sm)", fontWeight: 700, color: "var(--color-warning)" }}>TAXA ADM ({relatorio.adminFeePercent}%)</div>
                  <div style={{ fontSize: "var(--font-title-lg)", fontWeight: 700, color: "var(--color-warning)", marginTop: "var(--space-1)" }}>- {formatarMoeda(relatorio.totalAdminFeeAmount)}</div>
                </div>
                <div style={{ padding: "var(--space-3)", background: "var(--color-primary-container)", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "var(--font-body-sm)", fontWeight: 700, color: "var(--color-on-surface)" }}>VALOR LÍQUIDO</div>
                  <div style={{ fontSize: "var(--font-title-lg)", fontWeight: 700, color: "var(--color-on-surface)", marginTop: "var(--space-1)" }}>{formatarMoeda(relatorio.totalNetAmount)}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "var(--font-body-md)", fontWeight: 600, color: "var(--color-on-surface)", marginBottom: "var(--space-2)" }}>
                  Discriminação dos Recebimentos ({relatorio.items.length})
                </h3>
                {relatorio.items.length === 0 ? (
                  <p style={{ fontSize: "var(--font-body-md)", color: "var(--color-on-surface)", background: "var(--color-primary-container)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)" }}>
                    Nenhum pagamento recebido dos locatários nesta competência.
                  </p>
                ) : (
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-sm)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-body-sm)" }}>
                      <thead>
                        <tr style={{ background: "var(--color-primary-container)", textAlign: "left", color: "var(--color-on-surface)" }}>
                          <th style={{ padding: "var(--space-2)" }}>Data</th>
                          <th style={{ padding: "var(--space-2)" }}>Imóvel</th>
                          <th style={{ padding: "var(--space-2)" }}>Locatário</th>
                          <th style={{ padding: "var(--space-2)" }}>Valor Pago</th>
                          <th style={{ padding: "var(--space-2)" }}>Taxa</th>
                          <th style={{ padding: "var(--space-2)" }}>Líquido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.items.map((item, idx) => (
                          <tr key={item.paymentId || idx} style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
                            <td style={{ padding: "var(--space-2)" }}>{new Date(item.paidAt).toLocaleDateString("pt-BR")}</td>
                            <td style={{ padding: "var(--space-2)" }}>{item.propertyTitle}</td>
                            <td style={{ padding: "var(--space-2)" }}>{item.tenantName}</td>
                            <td style={{ padding: "var(--space-2)", color: "var(--color-success)" }}>{formatarMoeda(item.grossAmount)}</td>
                            <td style={{ padding: "var(--space-2)", color: "var(--color-warning)" }}>- {formatarMoeda(item.adminFeeAmount)}</td>
                            <td style={{ padding: "var(--space-2)", fontWeight: 600, color: "var(--color-on-surface)" }}>{formatarMoeda(item.netAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--color-primary-container)", borderTop: "1px solid var(--color-outline-variant)", display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button className="ui-action ui-action--neutral ui-action--large" type="button" onClick={onClose}>
            Fechar
          </button>
          <button className="ui-action ui-action--primary ui-action--large" type="button" onClick={exportarPdf} disabled={exportando}>
            {exportando ? "Gerando PDF..." : "Exportar Relatório PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Contatos;
