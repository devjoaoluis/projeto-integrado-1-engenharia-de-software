import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function VistoriaImovel() {
  const { idImovel } = useParams();
  const navigate = useNavigate();

  // Estados para gerenciar as vistorias
  const [tipoVistoria, setTipoVistoria] = useState('entrada'); // 'entrada' ou 'saida'
  const [observacoes, setObservacoes] = useState('');
  const [arquivos, setArquivos] = useState([]);
  
  // Simulando vistorias já salvas 
  const [vistoriasRealizadas, setVistoriasRealizadas] = useState({
    entrada: true, // Já realizada neste exemplo
    saida: false   // Pendente
  });

  const handleFileChange = (e) => {
    const novosArquivos = Array.from(e.target.files);
    setArquivos((prev) => [...prev, ...novosArquivos]);
  };

  const handleRemoverArquivo = (index) => {
    setArquivos(arquivos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (arquivos.length === 0) {
      alert("É obrigatório anexar pelo menos uma foto ou vídeo para registrar a vistoria com respaldo jurídico!");
      return;
    }

    // Lógica para salvar a vistoria (API / Estado global)
    console.log(`Salvando vistoria de ${tipoVistoria} para o imóvel ${idImovel}`, {
      observacoes,
      arquivos,
      data: new Date().toISOString()
    });

    setVistoriasRealizadas((prev) => ({
      ...prev,
      [tipoVistoria]: true
    }));

    alert(`Vistoria de ${tipoVistoria} registrada com sucesso!`);
    setArquivos([]);
    setObservacoes('');
  };

  return (
    <div className="vistoria-container">
      <style>{`
        .vistoria-container {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          background: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .header-vistoria {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-weight: bold;
          font-size: 14px;
          color: #333;
        }
        .form-group select, .form-group textarea, .form-group input {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        .file-list {
          margin-top: 10px;
          list-style: none;
          padding: 0;
        }
        .file-item {
          display: flex;
          justify-content: space-between;
          background: #fff;
          padding: 8px 12px;
          border: 1px solid #ddd;
          margin-bottom: 6px;
          border-radius: 4px;
          font-size: 13px;
        }
        .btn-remover {
          color: #d32f2f;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-salvar {
          background-color: #1976d2;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
        }
        .btn-salvar:hover {
          background-color: #115293;
        }
        .aviso-rn03 {
          background: #fff3cd;
          color: #856404;
          padding: 10px;
          border-radius: 4px;
          font-size: 13px;
          margin-bottom: 16px;
          border: 1px solid #ffeeba;
        }
      `}</style>

      <div className="header-vistoria">
        <h2>Registro de Vistoria (Entrada e Saída)</h2>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }}>
          &larr; Voltar
        </button>
      </div>

      <div className="aviso-rn03">
        <strong></strong> A realização da vistoria (com upload de mídias) é obrigatória tanto na <strong>Entrada</strong> quanto na <strong>Saída</strong> do imóvel para garantir respaldo jurídico.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tipo de Vistoria</label>
          <select value={tipoVistoria} onChange={(e) => setTipoVistoria(e.target.value)}>
            <option value="entrada">Vistoria de Entrada</option>
            <option value="saida">Vistoria de Saída</option>
          </select>
        </div>

        <div className="form-group">
          <label>Observações do Imóvel (Paredes, pisos, instalações, etc.)</label>
          <textarea 
            rows="4" 
            value={observacoes} 
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Descreva detalhadamente o estado atual do imóvel..."
            required
          />
        </div>

        <div className="form-group">
          <label>Anexar Fotos e Vídeos (Obrigatório)</label>
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*" 
            onChange={handleFileChange} 
          />
          <small style={{ color: '#666', marginTop: '4px' }}>Você pode selecionar múltiplos arquivos (JPG, PNG, MP4, etc.)</small>
        </div>

        {arquivos.length > 0 && (
          <div className="form-group">
            <label>Arquivos Selecionados ({arquivos.length})</label>
            <ul className="file-list">
              {arquivos.map((file, index) => (
                <li key={index} className="file-item">
                  <span>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                  <button type="button" className="btn-remover" onClick={() => handleRemoverArquivo(index)}>
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" className="btn-salvar">
          Salvar Vistoria de {tipoVistoria.toUpperCase()}
        </button>
      </form>
    </div>
  );
}