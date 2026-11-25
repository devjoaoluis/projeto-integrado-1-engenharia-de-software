
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  X,
  FileText,
  Image,
  Video,
  Eye,
  RefreshCw
} from "lucide-react";

const AZUL = "#1877f2";

const estiloCampo = {
  width: "100%",
  height: "42px",
  padding: "0 12px",
  border: "1px solid #d0d5dd",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#fff"
};

const formInicial = {
  propertyId: "",
  contractId: "",
  tipo: "ENTRY",
  data: new Date().toISOString().slice(0, 10),
  description: "",
  reportReference: "",
  arquivos: []
};

function formatarData(timestamp) {
  if (!timestamp) return "-";

  return new Date(timestamp).toLocaleDateString("pt-BR", {
    timeZone: "UTC"
  });
}

function nomeTipo(tipo) {
  return tipo === "ENTRY" ? "Entrada" : "Saída";
}

export default function Vistorias() {
  const navigate = useNavigate();

  const [vistorias, setVistorias] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [contratos, setContratos] = useState([]);

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [form, setForm] = useState(formInicial);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Carrega imóveis e respectivas vistorias
  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const propriedades = await window.api.properties.list();

      setImoveis(propriedades);

      const resultados = await Promise.all(
        propriedades.map(async (imovel) => {
          const [vistoriaList, overview] = await Promise.all([
            window.api.inspections.list({
              propertyId: imovel.id
            }),
            window.api.properties.overview(imovel.id)
          ]);

          const contratosImovel = [
            ...(overview.contracts?.current || []),
            ...(overview.contracts?.previous || []),
            ...(overview.contracts?.scheduled || [])
          ];

          return {
            imovel,
            vistorias: vistoriaList.map((vistoria) => ({
              ...vistoria,
              propertyName: imovel.title,
              contractReference:
                contratosImovel.find(
                  (contrato) => contrato.id === vistoria.contractId
                )?.reference || vistoria.contractId,
              media: vistoria.media || []
            }))
          };
        })
      );

      const todas = resultados.flatMap(
        (resultado) => resultado.vistorias
      );

      todas.sort((a, b) => b.inspectedAt - a.inspectedAt);

      setVistorias(todas);
    } catch (error) {
      console.error("Erro ao carregar vistorias:", error);
      setErro(error.message || "Não foi possível carregar as vistorias.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Carrega os contratos do imóvel selecionado
  async function carregarContratos(propertyId) {
    setContratos([]);

    if (!propertyId) return;

    try {
      const overview = await window.api.properties.overview(propertyId);

      const todos = [
        ...(overview.contracts?.current || []),
        ...(overview.contracts?.previous || []),
        ...(overview.contracts?.scheduled || [])
      ];

      setContratos(
        todos.filter((contrato) => contrato.status !== "CANCELLED")
      );
    } catch (error) {
      console.error("Erro ao carregar contratos:", error);
      setErro(error.message || "Não foi possível carregar os contratos.");
    }
  }

  function abrirModal() {
    setForm(formInicial);
    setContratos([]);
    setErro("");
    setMostrarModal(true);
  }

  function alterarImovel(propertyId) {
    setForm((atual) => ({
      ...atual,
      propertyId,
      contractId: ""
    }));

    carregarContratos(propertyId);
  }

  function selecionarArquivos(event) {
    const novos = Array.from(event.target.files || []);

    setForm((atual) => ({
      ...atual,
      arquivos: [...atual.arquivos, ...novos]
    }));

    event.target.value = "";
  }

  function removerArquivo(index) {
    setForm((atual) => ({
      ...atual,
      arquivos: atual.arquivos.filter((_, i) => i !== index)
    }));
  }

  async function salvarVistoria(event) {
    event.preventDefault();

    if (!form.propertyId || !form.contractId) {
      setErro("Selecione o imóvel e o contrato.");
      return;
    }

    if (!form.description.trim()) {
      setErro("Informe a descrição da vistoria.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const sourceFilePaths = form.arquivos.map((arquivo) =>
        window.api.getPathForFile(arquivo)
      );

      const data = {
        propertyId: form.propertyId,
        contractId: form.contractId,
        inspectedAt: new Date(
          `${form.data}T00:00:00`
        ).getTime(),
        description: form.description.trim(),
        reportReference: form.reportReference.trim() || undefined,
        sourceFilePaths
      };

      if (form.tipo === "ENTRY") {
        await window.api.inspections.recordEntry(data);
      } else {
        await window.api.inspections.recordExit(data);
      }

      alert("Vistoria registrada com sucesso!");

      setMostrarModal(false);
      setForm(formInicial);

      await carregarDados();
    } catch (error) {
      console.error("Erro ao registrar vistoria:", error);
      setErro(error.message || "Não foi possível registrar a vistoria.");
    } finally {
      setSalvando(false);
    }
  }

  // Pesquisa e filtros
  const filtradas = useMemo(() => {
    return vistorias.filter((vistoria) => {
      const texto = [
        vistoria.propertyName,
        vistoria.contractReference,
        vistoria.description,
        vistoria.reportReference
      ]
        .join(" ")
        .toLowerCase();

      const correspondeBusca = texto.includes(busca.toLowerCase());

      const correspondeTipo =
        filtroTipo === "TODOS" || vistoria.type === filtroTipo;

      return correspondeBusca && correspondeTipo;
    });
  }, [vistorias, busca, filtroTipo]);

  const totalEntradas = vistorias.filter(
    (v) => v.type === "ENTRY"
  ).length;

  const totalSaidas = vistorias.filter(
    (v) => v.type === "EXIT"
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

      {/* Cabeçalho */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <h2 style={{ color: "#1d2939", margin: 0, fontSize: "25px" }}>
            Gerenciamento de Vistorias
          </h2>

          <p style={{ color: "#667085", margin: "6px 0 0" }}>
            Registre e acompanhe as vistorias dos imóveis.
          </p>
        </div>

        <button
          onClick={abrirModal}
          style={{
            background: AZUL,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "11px 17px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          <Plus size={18} />
          Nova vistoria
        </button>
      </div>

      {/* Indicadores */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "15px"
      }}>
        {[
          { titulo: "Total de vistorias", valor: vistorias.length },
          { titulo: "Vistorias de entrada", valor: totalEntradas },
          { titulo: "Vistorias de saída", valor: totalSaidas }
        ].map((item) => (
          <div key={item.titulo} style={{
            background: "#fff",
            border: "1px solid #eaecf0",
            borderRadius: "8px",
            padding: "18px"
          }}>
            <p style={{ color: "#667085", margin: 0, fontSize: "13px" }}>
              {item.titulo}
            </p>

            <strong style={{
              display: "block",
              marginTop: "8px",
              fontSize: "26px",
              color: "#1877f2"
            }}>
              {item.valor}
            </strong>
          </div>
        ))}
      </div>

      {/* Pesquisa */}
      <div style={{
        display: "flex",
        gap: "12px",
        flexWrap: "wrap"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: "1px solid #d0d5dd",
          borderRadius: "6px",
          padding: "0 12px",
          flex: 1,
          minWidth: "200px",
          background: "#fff"
        }}>
          <Search size={18} color="#667085" />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar imóvel, contrato..."
            style={{
              border: "none",
              outline: "none",
              height: "42px",
              width: "100%"
            }}
          />
        </div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ ...estiloCampo, width: "210px" }}
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="ENTRY">Entrada</option>
          <option value="EXIT">Saída</option>
        </select>

        <button
          onClick={carregarDados}
          title="Atualizar listagem"
          style={{
            background: "#fff",
            border: "1px solid #d0d5dd",
            borderRadius: "6px",
            padding: "0 14px",
            cursor: "pointer",
            color: AZUL
          }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Erro */}
      {erro && !mostrarModal && (
        <div style={{
          background: "#fef3f2",
          color: "#b42318",
          padding: "12px",
          borderRadius: "6px"
        }}>
          {erro}
        </div>
      )}

      {/* Listagem */}
      <div style={{
        background: "#fff",
        border: "1px solid #eaecf0",
        borderRadius: "8px",
        overflowX: "auto"
      }}>
        <div style={{
          minWidth: "700px",
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr 90px",
          gap: "12px",
          padding: "15px",
          borderBottom: "1px solid #eaecf0",
          color: AZUL,
          fontSize: "13px",
          fontWeight: "600"
        }}>
          <span>Imóvel / Contrato</span>
          <span>Tipo</span>
          <span>Data</span>
          <span>Anexos</span>
          <span>Ação</span>
        </div>

        {carregando ? (
          <p style={{ textAlign: "center", padding: "30px", color: "#667085" }}>
            Carregando vistorias...
          </p>
        ) : filtradas.length === 0 ? (
          <p style={{ textAlign: "center", padding: "35px", color: "#667085" }}>
            Nenhuma vistoria encontrada.
          </p>
        ) : (
          filtradas.map((vistoria) => (
            <div
              key={vistoria.id}
              style={{
                minWidth: "700px",
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr 90px",
                gap: "12px",
                alignItems: "center",
                padding: "15px",
                borderBottom: "1px solid #f2f4f7"
              }}
            >
              <div>
                <strong style={{ color: "#344054", fontSize: "14px" }}>
                  {vistoria.propertyName}
                </strong>

                <p style={{
                  margin: "4px 0 0",
                  color: "#667085",
                  fontSize: "12px"
                }}>
                  {vistoria.contractReference || "Contrato não identificado"}
                </p>
              </div>

              <span style={{
                background: vistoria.type === "ENTRY" ? "#dbeafe" : "#fef3c7",
                color: vistoria.type === "ENTRY" ? "#1e40af" : "#92400e",
                padding: "5px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                width: "fit-content"
              }}>
                {nomeTipo(vistoria.type)}
              </span>

              <span style={{ fontSize: "13px", color: "#475467" }}>
                {formatarData(vistoria.inspectedAt)}
              </span>

              <span style={{
                fontSize: "13px",
                color: "#475467",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}>
                <FileText size={16} />
                {vistoria.media.length}
              </span>

              <button
                onClick={() => navigate(`/vistorias/${vistoria.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "#eff6ff",
                  border: "none",
                  color: AZUL,
                  padding: "8px",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                <Eye size={16} />
                Ver
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal de cadastro */}
      {mostrarModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "15px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "10px",
            padding: "25px",
            width: "550px",
            maxWidth: "100%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <h3 style={{ margin: 0, color: "#344054" }}>
                Nova vistoria
              </h3>

              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer"
                }}
              >
                <X size={21} />
              </button>
            </div>

            <form
              onSubmit={salvarVistoria}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label>Tipo de vistoria *</label>

                <select
                  value={form.tipo}
                  onChange={(e) => setForm({
                    ...form,
                    tipo: e.target.value
                  })}
                  style={estiloCampo}
                >
                  <option value="ENTRY">Vistoria de entrada</option>
                  <option value="EXIT">Vistoria de saída</option>
                </select>
              </div>

              <div>
                <label>Imóvel *</label>

                <select
                  value={form.propertyId}
                  onChange={(e) => alterarImovel(e.target.value)}
                  style={estiloCampo}
                  required
                >
                  <option value="">Selecione um imóvel</option>

                  {imoveis.map((imovel) => (
                    <option key={imovel.id} value={imovel.id}>
                      {imovel.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Contrato *</label>

                <select
                  value={form.contractId}
                  onChange={(e) => setForm({
                    ...form,
                    contractId: e.target.value
                  })}
                  style={estiloCampo}
                  required
                  disabled={!form.propertyId}
                >
                  <option value="">Selecione um contrato</option>

                  {contratos.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.reference}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Data da vistoria *</label>

                <input
                  type="date"
                  value={form.data}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm({
                    ...form,
                    data: e.target.value
                  })}
                  style={estiloCampo}
                  required
                />
              </div>

              <div>
                <label>Referência do relatório</label>

                <input
                  value={form.reportReference}
                  onChange={(e) => setForm({
                    ...form,
                    reportReference: e.target.value
                  })}
                  placeholder="Ex: REL-VIS-001"
                  style={estiloCampo}
                />
              </div>

              <div>
                <label>Descrição da vistoria *</label>

                <textarea
                  value={form.description}
                  onChange={(e) => setForm({
                    ...form,
                    description: e.target.value
                  })}
                  placeholder="Descreva o estado do imóvel..."
                  required
                  rows={5}
                  style={{
                    ...estiloCampo,
                    height: "auto",
                    padding: "10px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div>
                <label>Fotos e vídeos (opcional)</label>

                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.mkv,.webm"
                  onChange={selecionarArquivos}
                  style={{ display: "block", marginTop: "8px" }}
                />

                <small style={{ color: "#667085" }}>
                  Formatos aceitos: JPG, JPEG, PNG, WEBP, MP4, MKV e WEBM.
                </small>

                {form.arquivos.map((arquivo, index) => (
                  <div key={`${arquivo.name}-${index}`} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px",
                    background: "#f9fafb",
                    marginTop: "7px",
                    borderRadius: "5px",
                    fontSize: "12px"
                  }}>
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      overflow: "hidden"
                    }}>
                      {arquivo.type.startsWith("video") ? (
                        <Video size={16} />
                      ) : (
                        <Image size={16} />
                      )}
                      {arquivo.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => removerArquivo(index)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#d92d20",
                        cursor: "pointer"
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {erro && (
                <p style={{ color: "#b42318", fontSize: "13px" }}>
                  {erro}
                </p>
              )}

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}>
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid #d0d5dd",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background: AZUL,
                    color: "#fff",
                    cursor: salvando ? "not-allowed" : "pointer",
                    opacity: salvando ? 0.7 : 1
                  }}
                >
                  {salvando ? "Salvando..." : "Registrar vistoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
