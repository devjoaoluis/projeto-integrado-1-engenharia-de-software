import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const locatarioDetalhadoMock = {
  id: 1,
  nome: "Marcos Oliveira da Silva",
  cpf: "123.456.789-00",
  email: "marcos.silva@email.com",
  telefone: "(88) 99911-0001",
  imovel: "Apto 101 - Centro",
  status: "Inadimplente",
  documentos: [
    { id: 1, nome: "RG_Marcos_Oliveira.pdf", categoria: "Identificação", dataEnvio: "15/03/2026" },
    { id: 2, nome: "Comprovante_Renda.pdf", categoria: "Comprovante de Renda", dataEnvio: "18/03/2026" }
  ]
};

export default function VisaoGeralLocatario() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados para simular a adição de um novo documento
  const [documentos, setDocumentos] = useState(locatarioDetalhadoMock.documentos);
  const [novaCategoria, setNovaCategoria] = useState("Identificação");
  const [novoArquivo, setNovoArquivo] = useState(null);

  // Aqui você buscaria na lista global de locatários se houver
  const locatario = locatarioDetalhadoMock; // Simplificado para o exemplo

  const handleUpload = (e) => {
    e.preventDefault();
    if (!novoArquivo) {
      alert("Selecione um arquivo para enviar.");
      return;
    }

    const novoDoc = {
      id: documentos.length + 1,
      nome: novoArquivo.name,
      categoria: novaCategoria,
      dataEnvio: new Date().toLocaleDateString("pt-BR")
    };

    setDocumentos([...documentos, novoDoc]);
    setNovoArquivo(null);
    alert("Documento enviado com sucesso!");
  };

  const handleExcluir = (idDoc) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      setDocumentos(documentos.filter(doc => doc.id !== idDoc));
    }
  };

  return (
    <div className="visao-geral-container">
      <style>{`
        .visao-geral-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
          background-color: #f8f9fa;
          min-height: 100vh;
        }

        .voltar-btn {
          align-self: flex-start;
          background: none;
          border: none;
          color: #1976d2;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .locatario-header-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .locatario-info h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #333;
        }

        .locatario-info p {
          margin: 4px 0;
          color: #666;
          font-size: 14px;
        }

        .badge-status {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          background-color: #ffebee;
          color: #c62828;
        }

        .dossie-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 24px;
        }

        .dossie-section h2 {
          margin-top: 0;
          font-size: 18px;
          color: #333;
          margin-bottom: 16px;
        }

        .upload-form {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          background: #fdfdfd;
          padding: 16px;
          border: 1px dashed #ccc;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: bold;
          color: #555;
        }

        .form-group select, .form-group input {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .btn-enviar {
          background-color: #1976d2;
          color: white;
          border: none;
          padding: 9px 16px;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
        }

        .btn-enviar:hover {
          background-color: #115293;
        }

        .tabela-documentos {
          width: 100%;
          border-collapse: collapse;
        }

        .tabela-documentos th, .tabela-documentos td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }

        .tabela-documentos th {
          color: #777;
          font-weight: 600;
        }

        .acoes-btns {
          display: flex;
          gap: 12px;
        }

        .btn-acao-baixar {
          color: #1976d2;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-acao-excluir {
          color: #d32f2f;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }
      `}</style>

      {/* Botão Voltar */}
      <button className="voltar-btn" onClick={() => navigate("/locatarios")}>
        &larr; Voltar para Locatários
      </button>

      {/* Cabeçalho do Locatário */}
      <div className="locatario-header-card">
        <div className="locatario-info">
          <h1>{locatario.nome}</h1>
          <p><strong>CPF:</strong> {locatario.cpf} | <strong>E-mail:</strong> {locatario.email}</p>
          <p><strong>Telefone:</strong> {locatario.telefone} | <strong>Imóvel:</strong> {locatario.imovel}</p>
        </div>
        <div>
          <span className="badge-status">{locatario.status}</span>
        </div>
      </div>

      {/* Seção do Dossiê de Documentos  */}
      <div className="dossie-section">
        <h2>Documentos do Locatário</h2>

        {/* Formulário de Upload */}
        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label>Categoria</label>
            <select 
              value={novaCategoria} 
              onChange={(e) => setNovaCategoria(e.target.value)}
            >
              <option value="Identificação">Identificação (RG/CPF)</option>
              <option value="Comprovante de Renda">Comprovante de Renda</option>
              <option value="Contrato">Contrato</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="form-group">
            <label>Arquivo (PDF, JPG, PNG)</label>
            <input 
              type="file" 
              accept=".pdf, .jpg, .jpeg, .png"
              onChange={(e) => setNovoArquivo(e.target.files[0])}
            />
          </div>

          <button type="submit" className="btn-enviar">
            Enviar Arquivo
          </button>
        </form>

        {/* Tabela de Documentos Cadastrados */}
        <table className="tabela-documentos">
          <thead>
            <tr>
              <th>Nome do Arquivo</th>
              <th>Categoria</th>
              <th>Data de Envio</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {documentos.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#777', padding: '20px' }}>
                  Nenhum documento cadastrado neste dossiê.
                </td>
              </tr>
            ) : (
              documentos.map((doc) => (
                <tr key={doc.id}>
                  <td><strong>{doc.nome}</strong></td>
                  <td>{doc.categoria}</td>
                  <td>{doc.dataEnvio}</td>
                  <td>
                    <div className="acoes-btns">
                      <button className="btn-acao-baixar" onClick={() => alert(`Baixando ${doc.nome}`)}>
                        Baixar
                      </button>
                      <button className="btn-acao-excluir" onClick={() => handleExcluir(doc.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}