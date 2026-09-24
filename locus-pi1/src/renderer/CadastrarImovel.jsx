import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Campo from "./components/Campo";
import UploadMidia from "./components/UploadMidia";

// As opções dos selects são provisórias: confirmar com o pessoal do backend
const TIPOS = ["Residencial", "Comercial"];
const SITUACOES_FISCAIS = ["Regular", "Pendente"];
const SITUACOES_SANEAMENTO = ["Regular", "Irregular"];

const dadosVazios = {
    rua: "",
    bairro: "",
    numero: "",
    complemento: "",
    valorAluguel: "",
    tipo: "",
    situacaoSaneamento: "",
    valorIptu: "",
    situacaoFiscal: "",
    dataCadastro: "",
    descricao: "",
};

function CadastrarImovel() {
    const navigate = useNavigate();
    const [dados, setDados] = useState(dadosVazios);
    const [fotos, setFotos] = useState([]);
    const [videos, setVideos] = useState([]);

    // Serve para todos os campos: usa o "name" de cada um
    function mudar(e) {
        const { name, value } = e.target;
        setDados((antigo) => ({ ...antigo, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const enderecoFormatado = `${dados.rua}, ${dados.numero}${dados.complemento ? ' - ' + dados.complemento : ''}, ${dados.bairro}`;
            
            const novoImovel = await window.api.properties.create({
                title: dados.rua || "Sem título", 
                address: enderecoFormatado,
                description: dados.descricao || "",
                price: Number(dados.valorAluguel) || 0
            });

            const arquivos = [...fotos, ...videos].map((m) => m.file);
            for (const arquivo of arquivos) {
                if (arquivo.path) {
                    await window.api.propertyMedia.add({
                        propertyId: novoImovel.id,
                        sourceFilePath: arquivo.path
                    });
                }
            }

            alert("Cadastro de Imóvel bem sucedido");
            navigate("/imoveis");
        } catch (error) {
            console.error(error);
            alert("Erro ao cadastrar: " + error.message);
        }
    }

    return (
        <>
            <style>
                {`
                    .cadastro-fundo {
                        background-color: #1976d2;
                        border-radius: 8px;
                        padding: 32px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 28px;
                    }

                    .cadastro-card {
                        width: 100%;
                        background-color: white;
                        border-radius: 8px;
                        padding: 32px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    }

                    .cadastro-titulo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #1976d2;
                        margin-bottom: 28px;
                    }

                    .cadastro-grade {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr;
                        gap: 24px 32px;
                    }

                    .cadastro-largo {
                        grid-column: span 2;
                    }

                    .cadastro-cheio {
                        grid-column: 1 / -1;
                    }

                    .cadastro-botao {
                        width: 260px;
                        height: 50px;
                        border: none;
                        border-radius: 4px;
                        background-color: #52a3f7;
                        color: white;
                        font-size: 18px;
                        letter-spacing: 1px;
                        cursor: pointer;
                    }

                    .cadastro-botao:hover {
                        background-color: #3b93ee;
                    }
                `}
            </style>

            <form className="cadastro-fundo" onSubmit={handleSubmit}>
                <div className="cadastro-card">
                    <h2 className="cadastro-titulo">Cadastrar imóvel</h2>

                    <div className="cadastro-grade">
                        {/* Linha 1 */}
                        <Campo label="Rua" name="rua" value={dados.rua} onChange={mudar} required />
                        <Campo
                            label="Valor do aluguel (R$)"
                            name="valorAluguel"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dados.valorAluguel}
                            onChange={mudar}
                            required
                        />
                        <Campo
                            label="Valor IPTU"
                            name="valorIptu"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dados.valorIptu}
                            onChange={mudar}
                        />

                        {/* Linha 2 */}
                        <Campo label="Bairro" name="bairro" value={dados.bairro} onChange={mudar} required />
                        <Campo
                            label="Tipo do imóvel"
                            name="tipo"
                            opcoes={TIPOS}
                            value={dados.tipo}
                            onChange={mudar}
                            required
                        />
                        <Campo
                            label="Situação Fiscal"
                            name="situacaoFiscal"
                            opcoes={SITUACOES_FISCAIS}
                            value={dados.situacaoFiscal}
                            onChange={mudar}
                        />

                        {/* Linha 3 */}
                        <Campo label="nº" name="numero" value={dados.numero} onChange={mudar} required />
                        <Campo
                            label="Situação Saneamento"
                            name="situacaoSaneamento"
                            opcoes={SITUACOES_SANEAMENTO}
                            value={dados.situacaoSaneamento}
                            onChange={mudar}
                        />
                        <Campo
                            label="Data de cadastro"
                            name="dataCadastro"
                            type="month"
                            value={dados.dataCadastro}
                            onChange={mudar}
                        />

                        {/* Linha 4 */}
                        <Campo
                            label="Complemento"
                            name="complemento"
                            value={dados.complemento}
                            onChange={mudar}
                        />
                        <div className="cadastro-largo">
                            <Campo
                                label="Descrição"
                                name="descricao"
                                multilinha
                                value={dados.descricao}
                                onChange={mudar}
                            />
                        </div>

                        {/* Fotos e vídeos */}
                        <div className="cadastro-cheio">
                            <UploadMidia
                                fotos={fotos}
                                setFotos={setFotos}
                                videos={videos}
                                setVideos={setVideos}
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" className="cadastro-botao">
                    CADASTRAR
                </button>
            </form>
        </>
    );
}

export default CadastrarImovel;