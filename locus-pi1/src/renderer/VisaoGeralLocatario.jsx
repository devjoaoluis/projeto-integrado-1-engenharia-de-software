import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function VisaoGeralLocatario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [locatario, setLocatario] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lista de documentos exigidos pelo Dossiê (HU-13)
  const [documentos, setDocumentos] = useState([
    { id: 1, nome: "Documento de Identificação (RG/CNH)", status: "Pendente", obrigatorio: true },
    { id: 2, nome: "Comprovante de Renda", status: "Pendente", obrigatorio: true },
    { id: 3, nome: "Comprovante de Residência Atual", status: "Pendente", obrigatorio: true },
    { id: 4, nome: "Certidão Negativa de Débitos", status: "Não enviado", obrigatorio: false },
  ]);

  useEffect(() => {
    async function carregarDados() {
      try {
        let lista = [];

        // Tenta carregar do Electron (window.api)
        if (window.api && window.api.clients && window.api.clients.list) {
          lista = await window.api.clients.list();
        } 
        
        // Se não encontrar ou estiver no modo standalone, tenta o localStorage
        if (!lista || lista.length === 0) {
          const salvos = localStorage.getItem("locus_locatarios");
          if (salvos) {
            lista = JSON.parse(salvos);
          }
        }

        // Procura o locatário correspondente ao ID da URL (ignorando diferenças entre string e número)
        const encontrado = (lista || []).find(
          (l) => String(l.id) === String(id)
        );

        if (encontrado) {
          setLocatario({
            ...encontrado,
            nome: encontrado.name || encontrado.nome || "Sem nome",
            telefone: encontrado.phone || encontrado.telefone || "—",
            email: encontrado.email || "—",
            cpf: encontrado.cpfCnpj || encontrado.cpf || "—",
            imovel: encontrado.imovel || encontrado.property || "—",
            status: encontrado.status || "Em dia"
          });
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes do locatário:", err);
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [id]);

  function alterarStatusDocumento(docId, novoStatus) {
    setDocumentos((atual) =>
      atual.map((doc) => (doc.id === docId ? { ...doc, status: novoStatus } : doc))
    );
  }

  if (loading) {
    return <p style={{ padding: "24px", color: "#667085" }}>A carregar dossiê do locatário...</p>;
  }

  if (!locatario) {
    return (
      <div style={{ padding: "24px", maxWidth: "800px", margin: "40px auto", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>Locatário não encontrado</h2>
        <p style={{ color: "#64748b", marginBottom: "20px" }}>
          Não foi possível encontrar o registo com o ID: <code>{id}</code>. É possível que os dados estejam apenas em memória ou que o ID tenha mudado.
        </p>
        <button
          onClick={() => navigate("/locatarios")}
          style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
        >
          Voltar para a lista de locatários
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Botão de Voltar */}
      <button
        onClick={() => navigate("/locatarios")}
        style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600", marginBottom: "16px", padding: 0, fontSize: "14px" }}
      >
        ← Voltar para a lista de locatários
      </button>

      {/* Cabeçalho com Informações do Locatário */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1d2939", marginBottom: "12px" }}>
              {locatario.nome}
            </h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: "14px", color: "#475569" }}>
              <p style={{ margin: 0 }}><strong>CPF/CNPJ:</strong> {locatario.cpf}</p>
              <p style={{ margin: 0 }}><strong>Telefone:</strong> {locatario.telefone}</p>
              <p style={{ margin: 0 }}><strong>E-mail:</strong> {locatario.email}</p>
              <p style={{ margin: 0 }}><strong>Imóvel Vinculado:</strong> {locatario.imovel}</p>
            </div>
          </div>
          <div>
            <span style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              backgroundColor: locatario.status === "Em dia" ? "#dcfce7" : locatario.status === "Atrasado" ? "#fee2e2" : "#fef3c7",
              color: locatario.status === "Em dia" ? "#15803d" : locatario.status === "Atrasado" ? "#b91c1c" : "#b45309"
            }}>
              {locatario.status}
            </span>
          </div>
        </div>
      </div>

      {/* Seção do Dossiê de Documentos (HU-13) */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1d2939", marginBottom: "6px" }}>
          Dossiê de Documentos do Locatário (HU-13)
        </h2>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
          Gerencie e verifique a entrega dos documentos obrigatórios para a formalização do contrato.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {documentos.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid #e2e8f0"
              }}
            >
              <div>
                <p style={{ fontWeight: "600", color: "#334155", margin: "0 0 4px 0" }}>
                  {doc.nome} {doc.obrigatorio && <span style={{ color: "#ef4444" }}>*</span>}
                </p>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Estado atual: <strong>{doc.status}</strong>
                </span>
              </div>
              <div>
                <select
                  value={doc.status}
                  onChange={(e) => alterarStatusDocumento(doc.id, e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", cursor: "pointer" }}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Rejeitado">Rejeitado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}