import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Campo from "../../../shared/common/components/Campo";
import UploadMidia from "../components/UploadMidia";
import { mensagemErro } from "../../../shared/common/utils/mensagemErro";
import BotaoVoltar from "../../../shared/common/components/BotaoVoltar";

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
    descricao: "",
    ownerId: "",
};

function CadastrarImovel() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const imovelEditar = location.state?.imovelEditar;

    const [dados, setDados] = useState(dadosVazios);
    const [fotos, setFotos] = useState([]);
    const [videos, setVideos] = useState([]);
    const [midiasExistentes, setMidiasExistentes] = useState([]);
    const [proprietarios, setProprietarios] = useState([]);
    const [erro, setErro] = useState("");

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
                ownerId: imovelEditar.ownerId || "",
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

        let ativo = true;
        window.api.owners.list()
            .then((lista) => {
                if (ativo) setProprietarios(lista || []);
            })
            .catch((error) => {
                console.error("Erro ao carregar proprietários:", error);
                if (ativo) setErro("Não foi possível carregar os proprietários.");
            });
        return () => { ativo = false; };
    }, [imovelEditar]);

    function mudar(e) {
        const { name, value } = e.target;
        setDados((antigo) => ({ ...antigo, [name]: value }));
    }

    async function excluirMidiaExistente(idMidia) {
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
            console.error("Erro ao excluir mídia:", error);
            setErro(mensagemErro(error, "Não foi possível excluir a mídia. Tente novamente."));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            if (!dados.ownerId) {
                setErro("Selecione um proprietário para salvar o imóvel.");
                return;
            }

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
                registrationDate: imovelEditar?.registrationDate || new Date().toLocaleDateString("pt-BR"),
                ownerId: dados.ownerId,
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
            setErro(mensagemErro(error, "Não foi possível salvar o imóvel. Confira os dados e tente novamente."));
        }
    }

    const textoBotao = imovelEditar ? "ATUALIZAR" : "CADASTRAR";
    const tituloPagina = imovelEditar ? "Atualizar imóvel" : "Cadastrar imóvel";

    return (
        <>
            <BotaoVoltar destino="/imoveis" texto="Voltar para imóveis" />
            <style>
                {`
                    .cadastro-fundo {
                        background-color: var(--color-primary);
                        border-radius: var(--radius-sm);
                        padding: var(--space-6);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: var(--space-5);
                    }

                    .cadastro-card {
                        width: 100%;
                        background-color: var(--color-surface);
                        border-radius: var(--radius-sm);
                        padding: var(--space-6);
                        box-shadow: var(--elevation-2);
                    }

                    .cadastro-titulo {
                        font-size: var(--font-headline-lg);
                        font-weight: bold;
                        color: var(--color-on-surface);
                        margin-bottom: 28px;
                    }

                    .cadastro-grade {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr;
                        gap: var(--space-5) var(--space-6);
                    }

                    .cadastro-largo {
                        grid-column: span 2;
                    }

                    .cadastro-cheio {
                        grid-column: 1 / -1;
                    }

                    .galeria-existente {
                        margin-top: 16px;
                        background: var(--color-primary-container);
                        padding: var(--space-4);
                        border-radius: var(--radius-sm);
                        border: 1px solid var(--color-outline-variant);
                    }

                    .grid-galeria {
                        display: flex;
                        gap: var(--space-3);
                        flex-wrap: wrap;
                        margin-top: 8px;
                    }

                    .item-galeria {
                        position: relative;
                        border: 1px solid var(--color-outline-variant);
                        border-radius: var(--radius-sm);
                        overflow: hidden;
                        background: var(--color-surface);
                        padding: var(--space-1);
                    }

                    .item-galeria img, .item-galeria video {
                        width: 120px;
                        height: 90px;
                        object-fit: cover;
                        display: block;
                        border-radius: var(--radius-xs);
                    }

                    .item-galeria button {
                        position: absolute;
                        top: 6px;
                        right: 6px;
                        background: var(--color-error);
                        color: var(--color-on-primary);
                        border: none;
                        border-radius: var(--radius-full);
                        width: 24px;
                        height: 24px;
                        font-size: var(--font-body-md);
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
                        border-radius: var(--radius-xs);
                        background-color: var(--color-primary);
                        color: var(--color-on-primary);
                        font-size: var(--font-title-lg);
                        letter-spacing: 1px;
                        cursor: pointer;
                    }

                    .cadastro-botao:hover {
                        background-color: var(--color-primary);
                    }
                `}
            </style>

            {erro && <p role="alert" style={{ color: "var(--color-error)", background: "var(--color-error-container)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-sm)" }}>{erro}</p>}
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
                            label="Valor do IPTU (R$)"
                            name="valorIptu"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dados.valorIptu}
                            onChange={mudar}
                        />
                        <Campo
                            label="Quartos"
                            name="quartos"
                            type="number"
                            min="0"
                            step="1"
                            value={dados.quartos}
                            onChange={mudar}
                        />

                        <div>
                            <Campo
                                label="Proprietário"
                                name="ownerId"
                                opcoes={proprietarios.map((proprietario) => ({
                                    value: proprietario.id,
                                    label: `${proprietario.name} - ${proprietario.cpfCnpj}`,
                                }))}
                                value={dados.ownerId}
                                onChange={mudar}
                                required
                            />
                            {proprietarios.length === 0 && (
                                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--font-body-sm)", color: "var(--color-warning)" }}>
                                    Nenhum proprietário cadastrado.{" "}
                                    <button
                                        type="button"
                                        onClick={() => navigate("/contatos")}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "var(--color-on-surface)",
                                            textDecoration: "underline",
                                            cursor: "pointer",
                                            padding: 0,
                                            fontWeight: "600",
                                        }}
                                    >
                                        Cadastrar em Contatos
                                    </button>
                                </p>
                            )}
                        </div>
                        <Campo
                            label="Tipo do imóvel"
                            name="tipo"
                            opcoes={TIPOS}
                            value={dados.tipo}
                            onChange={mudar}
                        />
                        <Campo
                            label="Situação fiscal"
                            name="situacaoFiscal"
                            opcoes={SITUACOES_FISCAIS}
                            value={dados.situacaoFiscal}
                            onChange={mudar}
                        />

                        <Campo label="Número" name="numero" value={dados.numero} onChange={mudar} required />
                        <Campo
                            label="Situação de saneamento"
                            name="situacaoSaneamento"
                            opcoes={SITUACOES_SANEAMENTO}
                            value={dados.situacaoSaneamento}
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
                                <label style={{ fontWeight: 'bold', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: "var(--space-2)" }}>
                                    Fotos e Vídeos Já Cadastrados ({midiasExistentes.length})
                                </label>
                                {midiasExistentes.length === 0 ? (
                                    <p style={{ color: 'var(--color-on-surface-variant)', fontSize: "var(--font-body-md)", margin: 0 }}>Nenhuma foto ou vídeo cadastrado para este imóvel.</p>
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
                                                    <button type="button" title="Excluir mídia" onClick={() => excluirMidiaExistente(id)}>×</button>
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