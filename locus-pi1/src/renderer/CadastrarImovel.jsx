import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Campo from "./components/Campo";
import UploadMidia from "./components/UploadMidia";

const TIPOS = ["Residencial", "Comercial"];
const SITUACOES_FISCAIS = ["Regular", "Pendente"];
const SITUACOES_SANEAMENTO = ["Regular", "Irregular"];

const dadosVazios = {
    rua: "",
    bairro: "",
    numero: "",
    complemento: "",
    valorAluguel: "",
    quartos: "",
    tipo: "",
    situacaoSaneamento: "",
    valorIptu: "",
    situacaoFiscal: "",
    dataCadastro: "",
    descricao: "",
};

function formatarDataCadastro(value) {
    if (!value) return "";
    if (typeof value === "number" || /^\d+$/.test(String(value))) {
        const data = new Date(Number(value));
        if (!Number.isNaN(data.getTime())) {
            return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
        }
    }
    const texto = String(value);
    return texto.length >= 7 ? texto.substring(0, 7) : texto;
}

function CadastrarImovel() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const imovelEditar = location.state?.imovelEditar;

    const [dados, setDados] = useState(dadosVazios);
    const [fotos, setFotos] = useState([]);
    const [videos, setVideos] = useState([]);
    const [midiasExistentes, setMidiasExistentes] = useState([]);

    useEffect(() => {
        if (imovelEditar) {
            let ruaExt = imovelEditar.rua || imovelEditar.title || "";
            let bairroExt = imovelEditar.bairro || imovelEditar.neighborhood || "";
            let numeroExt = imovelEditar.numero || "";
            let compExt = imovelEditar.complemento || "";

            if (!imovelEditar.rua && imovelEditar.address) {
                const partes = imovelEditar.address.split(", ");
                if (partes.length > 0) ruaExt = partes[0];
                if (partes.length > 1) {
                    const numComp = partes[1].split(" - ");
                    numeroExt = numComp[0] || "";
                    compExt = numComp[1] || "";
                }
                if (partes.length > 2) bairroExt = partes[2];
            }

            const dataCadFormatada = formatarDataCadastro(
                imovelEditar.registrationDate ||
                imovelEditar.dataCadastro ||
                imovelEditar.createdAt
            );

            setDados({
                rua: ruaExt,
                bairro: bairroExt,
                numero: numeroExt,
                complemento: compExt,
                valorAluguel: imovelEditar.valorAluguel ?? imovelEditar.price ?? "",
                quartos: imovelEditar.quartos ?? imovelEditar.bedrooms ?? "",
                descricao: imovelEditar.descricao ?? imovelEditar.description ?? "",
                valorIptu: imovelEditar.valorIptu ?? imovelEditar.iptu ?? "",
                tipo: imovelEditar.tipo ?? imovelEditar.type ?? "",
                situacaoFiscal: imovelEditar.situacaoFiscal ?? imovelEditar.fiscalStatus ?? "",
                situacaoSaneamento: imovelEditar.situacaoSaneamento ?? imovelEditar.sanitationStatus ?? "",
                dataCadastro: dataCadFormatada,
            });

            async function carregarMidias() {
                try {
                    let mídiasEncontradas = [];

                    if (window.api?.propertyMedia?.list) {
                        mídiasEncontradas = await window.api.propertyMedia.list(imovelEditar.id);
                    } else if (window.api?.invoke) {
                        mídiasEncontradas = await window.api.invoke("property-media:list", imovelEditar.id);
                    } else if (window.api?.ipcRenderer?.invoke) {
                        mídiasEncontradas = await window.api.ipcRenderer.invoke("property-media:list", imovelEditar.id);
                    }

                    if (!mídiasEncontradas || mídiasEncontradas.length === 0) {
                        mídiasEncontradas = imovelEditar.fotos || imovelEditar.videos || imovelEditar.midias || [];
                    }

                    setMidiasExistentes(mídiasEncontradas || []);
                } catch (err) {
                    console.error("Erro ao carregar mídias:", err);
                    setMidiasExistentes(imovelEditar.fotos || imovelEditar.midias || []);
                }
            }

            carregarMidias();
        } else {
            setDados(dadosVazios);
            setMidiasExistentes([]);
        }
    }, [imovelEditar]);

    function mudar(e) {
        const { name, value } = e.target;
        setDados((antigo) => ({ ...antigo, [name]: value }));
    }

    async function removerMidiaExistente(idMidia) {
        try {
            if (window.api?.propertyMedia?.delete) {
                await window.api.propertyMedia.delete(idMidia);
            } else if (window.api?.invoke) {
                await window.api.invoke("property-media:delete", idMidia);
            } else if (window.api?.ipcRenderer?.invoke) {
                await window.api.ipcRenderer.invoke("property-media:delete", idMidia);
            }
            setMidiasExistentes((prev) => prev.filter(m => (m.id || m) !== idMidia));
        } catch (error) {
            console.error("Erro ao remover mídia:", error);
            alert("Não foi possível remover a mídia.");
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const enderecoFormatado = `${dados.rua}, ${dados.numero}${dados.complemento ? ' - ' + dados.complemento : ''}, ${dados.bairro}`;
            
            const payloadImovel = {
                title: dados.rua || "Sem título",
                address: enderecoFormatado,
                rua: dados.rua,
                numero: dados.numero,
                complemento: dados.complemento,
                bairro: dados.bairro,
                description: dados.descricao || "",
                price: Number(dados.valorAluguel) || 0,
                valorAluguel: Number(dados.valorAluguel) || 0,
                bedrooms: dados.quartos === "" ? undefined : Number(dados.quartos),
                iptu: dados.valorIptu === "" ? undefined : Number(dados.valorIptu),
                valorIptu: dados.valorIptu === "" ? undefined : Number(dados.valorIptu),
                type: dados.tipo,
                tipo: dados.tipo,
                fiscalStatus: dados.situacaoFiscal,
                situacaoFiscal: dados.situacaoFiscal,
                sanitationStatus: dados.situacaoSaneamento,
                situacaoSaneamento: dados.situacaoSaneamento,
                registrationDate: dados.dataCadastro,
                dataCadastro: dados.dataCadastro,
            };

            let imovelId;

            if (imovelEditar) {
                await window.api.properties.update(imovelEditar.id, payloadImovel);
                imovelId = imovelEditar.id;
            } else {
                const novoImovel = await window.api.properties.create(payloadImovel);
                imovelId = novoImovel.id;
            }

            const itensMidia = [...fotos, ...videos];
            for (const item of itensMidia) {
                const fileObj = item.file || item;
                const caminhoArquivo = fileObj.caminhoLocal || fileObj.path || item.path;

                if (caminhoArquivo && window.api.propertyMedia?.add) {
                    await window.api.propertyMedia.add({
                        propertyId: imovelId,
                        sourceFilePath: caminhoArquivo
                    });
                }
            }

            navigate("/imoveis", { replace: true });
        } catch (error) {
            console.error("Erro ao processar imóvel:", error);
            alert("Erro ao salvar imóvel: " + (error.message || error));
        }
    }

    const textoBotao = imovelEditar ? "ATUALIZAR" : "CADASTRAR";
    const tituloPagina = imovelEditar ? "Atualizar imóvel" : "Cadastrar imóvel";

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

                    .galeria-existente {
                        margin-top: 16px;
                        background: #f8f9fa;
                        padding: 16px;
                        border-radius: 6px;
                        border: 1px solid #e0e0e0;
                    }

                    .grid-galeria {
                        display: flex;
                        gap: 12px;
                        flex-wrap: wrap;
                        margin-top: 8px;
                    }

                    .item-galeria {
                        position: relative;
                        border: 1px solid #ccc;
                        border-radius: 6px;
                        overflow: hidden;
                        background: white;
                        padding: 4px;
                    }

                    .item-galeria img, .item-galeria video {
                        width: 120px;
                        height: 90px;
                        object-fit: cover;
                        display: block;
                        border-radius: 4px;
                    }

                    .item-galeria button {
                        position: absolute;
                        top: 6px;
                        right: 6px;
                        background: rgba(220, 53, 69, 0.9);
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
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
                    <h2 className="cadastro-titulo">{tituloPagina}</h2>

                    <div className="cadastro-grade">
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
                        <Campo
                            label="Número de quartos"
                            name="quartos"
                            type="number"
                            min="0"
                            step="1"
                            value={dados.quartos}
                            onChange={mudar}
                        />

                        <Campo label="Bairro" name="bairro" value={dados.bairro} onChange={mudar} required />
                        <Campo
                            label="Tipo do imóvel"
                            name="tipo"
                            opcoes={TIPOS}
                            value={dados.tipo}
                            onChange={mudar}
                        />
                        <Campo
                            label="Situação Fiscal"
                            name="situacaoFiscal"
                            opcoes={SITUACOES_FISCAIS}
                            value={dados.situacaoFiscal}
                            onChange={mudar}
                        />

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

                        {imovelEditar && (
                            <div className="cadastro-cheio galeria-existente">
                                <label style={{ fontWeight: 'bold', color: '#1976d2', display: 'block', marginBottom: '8px' }}>
                                    Fotos e Vídeos Já Cadastrados ({midiasExistentes.length})
                                </label>
                                {midiasExistentes.length === 0 ? (
                                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Nenhuma foto ou vídeo cadastrado para este imóvel.</p>
                                ) : (
                                    <div className="grid-galeria">
                                        {midiasExistentes.map((midia, idx) => {
                                            const id = midia.id || idx;
                                            const caminho = midia.filePath || midia.caminho || midia.path || (typeof midia === 'string' ? midia : '');
                                            const urlSanitizada = window.api.sanitizePath ? window.api.sanitizePath(caminho) : caminho;
                                            const ehVideo = typeof caminho === 'string' && (caminho.endsWith('.mp4') || caminho.includes('video') || caminho.endsWith('.mov') || caminho.endsWith('.avi'));

                                            return (
                                                <div key={id} className="item-galeria">
                                                    {ehVideo ? (
                                                        <video src={urlSanitizada} controls />
                                                    ) : (
                                                        <img src={urlSanitizada} alt="Mídia do imóvel" />
                                                    )}
                                                    <button type="button" title="Remover mídia" onClick={() => removerMidiaExistente(id)}>×</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

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
                    {textoBotao}
                </button>
            </form>
        </>
    );
}

export default CadastrarImovel;