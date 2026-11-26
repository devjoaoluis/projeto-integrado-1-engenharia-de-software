
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Image, Video } from "lucide-react";

const estiloCard = {
  background: "#fff",
  border: "1px solid #eaecf0",
  borderRadius: "8px",
  padding: "20px"
};

function formatarData(timestamp) {
  if (!timestamp) return "-";

  return new Date(timestamp).toLocaleDateString("pt-BR", {
    timeZone: "UTC"
  });
}

export default function VistoriaImovel() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vistoria, setVistoria] = useState(null);
  const [imovel, setImovel] = useState(null);
  const [contrato, setContrato] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDetalhes() {
      try {
        setCarregando(true);
        setErro("");

        const resultado = await window.api.inspections.get(id);

        setVistoria(resultado);

        const overview = await window.api.properties.overview(
          resultado.propertyId
        );

        setImovel(overview.property);

        const contratos = [
          ...(overview.contracts?.current || []),
          ...(overview.contracts?.previous || []),
          ...(overview.contracts?.scheduled || [])
        ];

        setContrato(
          contratos.find((item) => item.id === resultado.contractId) || null
        );
      } catch (error) {
        console.error("Erro ao carregar vistoria:", error);
        setErro(error.message || "Não foi possível carregar a vistoria.");
      } finally {
        setCarregando(false);
      }
    }

    carregarDetalhes();
  }, [id]);

  if (carregando) {
    return <p>Carregando detalhes da vistoria...</p>;
  }

  if (erro) {
    return (
      <div style={estiloCard}>
        <p style={{ color: "#b42318" }}>{erro}</p>

        <button onClick={() => navigate("/vistorias")}>
          Voltar para vistorias
        </button>
      </div>
    );
  }

  if (!vistoria) return null;

  const entrada = vistoria.type === "ENTRY";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      maxWidth: "950px",
      margin: "0 auto"
    }}>
      <button
        onClick={() => navigate("/vistorias")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          border: "none",
          background: "none",
          color: "#1877f2",
          cursor: "pointer",
          fontWeight: "600",
          width: "fit-content"
        }}
      >
        <ArrowLeft size={18} />
        Voltar para vistorias
      </button>

      <div style={estiloCard}>
        <h2 style={{ marginTop: 0, color: "#344054" }}>
          Detalhes da vistoria
        </h2>

        <span style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: "20px",
          background: entrada ? "#dbeafe" : "#fef3c7",
          color: entrada ? "#1e40af" : "#92400e",
          fontSize: "13px",
          fontWeight: "600"
        }}>
          Vistoria de {entrada ? "Entrada" : "Saída"}
        </span>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "25px"
        }}>
          <div>
            <small style={{ color: "#667085" }}>Imóvel</small>
            <p style={{ fontWeight: "600" }}>
              {imovel?.title || vistoria.propertyId}
            </p>
          </div>

          <div>
            <small style={{ color: "#667085" }}>Endereço</small>
            <p>{imovel?.address || "-"}</p>
          </div>

          <div>
            <small style={{ color: "#667085" }}>Contrato</small>
            <p style={{ fontWeight: "600" }}>
              {contrato?.reference || vistoria.contractId}
            </p>
          </div>

          <div>
            <small style={{ color: "#667085" }}>Data</small>
            <p>{formatarData(vistoria.inspectedAt)}</p>
          </div>

          <div>
            <small style={{ color: "#667085" }}>Referência do relatório</small>
            <p>{vistoria.reportReference || "Não informada"}</p>
          </div>
        </div>
      </div>

      <div style={estiloCard}>
        <h3 style={{ color: "#344054", marginTop: 0 }}>
          Descrição da vistoria
        </h3>

        <p style={{
          color: "#475467",
          lineHeight: "1.7",
          whiteSpace: "pre-wrap"
        }}>
          {vistoria.description}
        </p>
      </div>

      <div style={estiloCard}>
        <h3 style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#344054",
          marginTop: 0
        }}>
          <FileText size={19} />
          Arquivos anexados
        </h3>

        {!vistoria.media?.length ? (
          <p style={{ color: "#667085" }}>
            Nenhum arquivo foi anexado a esta vistoria.
          </p>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            {vistoria.media.map((arquivo) => (
              <div
                key={arquivo.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#f9fafb",
                  padding: "12px",
                  borderRadius: "6px"
                }}
              >
                {arquivo.type === "VIDEO" ? (
                  <Video size={20} color="#1877f2" />
                ) : (
                  <Image size={20} color="#1877f2" />
                )}

                <div>
                  <strong style={{ fontSize: "13px" }}>
                    {arquivo.fileName}
                  </strong>

                  <p style={{
                    margin: "4px 0 0",
                    color: "#667085",
                    fontSize: "12px"
                  }}>
                    {(arquivo.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
