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
        .contato-acao.repasse { background: #059669; color: white; }
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
                      {aba === "owners" && (
                        <button type="button" className="contato-acao repasse" onClick={() => setProprietarioParaRepasse(contato)}>
                          Gerar Repasse
                        </button>
                      )}
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
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", fontFamily: "Inter, sans-serif"
    }} role="dialog" aria-modal="true">
      <div style={{
        background: "white", width: "min(720px, calc(100vw - 32px))", maxHeight: "90vh", borderRadius: "10px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden"
      }}>
        <div style={{ padding: "16px 20px", background: "#0f274a", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 700 }}>Relatório de Repasse ao Proprietário (RF18)</h2>
            <span style={{ fontSize: "12px", opacity: 0.85 }}>Prestação de contas: {proprietario.name}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
              Competência (MM/AAAA)
              <input
                type="text"
                value={mesAno}
                onChange={(e) => setMesAno(e.target.value)}
                placeholder="Ex: 03/2026"
                style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
              Taxa de Administração (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxaAdm}
                onChange={(e) => setTaxaAdm(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
              />
            </label>
          </div>

          {erro && (
            <div style={{ padding: "10px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "6px", color: "#991b1b", fontSize: "13px" }}>
              {erro}
            </div>
          )}

          {sucesso && (
            <div style={{ padding: "10px 14px", background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", fontSize: "13px" }}>
              {sucesso}
            </div>
          )}

          {carregando ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>Calculando repasse...</p>
          ) : relatorio ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div style={{ padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#166534" }}>TOTAL RECEBIDO</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#14532d", marginTop: "4px" }}>{formatarMoeda(relatorio.totalGrossAmount)}</div>
                </div>
                <div style={{ padding: "12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#92400e" }}>TAXA ADM ({relatorio.adminFeePercent}%)</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#78350f", marginTop: "4px" }}>- {formatarMoeda(relatorio.totalAdminFeeAmount)}</div>
                </div>
                <div style={{ padding: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af" }}>VALOR LÍQUIDO</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e3a8a", marginTop: "4px" }}>{formatarMoeda(relatorio.totalNetAmount)}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                  Discriminação dos Recebimentos ({relatorio.items.length})
                </h3>
                {relatorio.items.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#64748b", background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
                    Nenhum pagamento recebido dos locatários nesta competência.
                  </p>
                ) : (
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                          <th style={{ padding: "8px" }}>Data</th>
                          <th style={{ padding: "8px" }}>Imóvel</th>
                          <th style={{ padding: "8px" }}>Locatário</th>
                          <th style={{ padding: "8px" }}>Valor Pago</th>
                          <th style={{ padding: "8px" }}>Taxa</th>
                          <th style={{ padding: "8px" }}>Líquido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.items.map((item, idx) => (
                          <tr key={item.paymentId || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px" }}>{new Date(item.paidAt).toLocaleDateString("pt-BR")}</td>
                            <td style={{ padding: "8px" }}>{item.propertyTitle}</td>
                            <td style={{ padding: "8px" }}>{item.tenantName}</td>
                            <td style={{ padding: "8px", color: "#166534" }}>{formatarMoeda(item.grossAmount)}</td>
                            <td style={{ padding: "8px", color: "#b45309" }}>- {formatarMoeda(item.adminFeeAmount)}</td>
                            <td style={{ padding: "8px", fontWeight: 600, color: "#1e40af" }}>{formatarMoeda(item.netAmount)}</td>
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

        <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", background: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
            Fechar
          </button>
          <button type="button" onClick={exportarPdf} disabled={exportando} style={{ padding: "8px 16px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: exportando ? "not-allowed" : "pointer", fontSize: "13px" }}>
            {exportando ? "Gerando PDF..." : "Exportar Relatório PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Contatos;
