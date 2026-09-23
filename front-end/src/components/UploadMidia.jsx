// import { useEffect, useRef, useState } from "react";
// import { ImagePlus, Video, X } from "lucide-react";

// export const MAX_FOTOS = 10;
// export const MAX_VIDEOS = 2;

// const EXT_FOTOS = ["jpg", "jpeg", "png", "webp"];
// const EXT_VIDEOS = ["mp4", "mkv", "webm"];

// // Descobre se o arquivo é foto ou vídeo pela extensão (as mesmas que o backend aceita)
// function tipoDoArquivo(file) {
//     const ext = file.name.split(".").pop().toLowerCase();
//     if (EXT_FOTOS.includes(ext)) return "foto";
//     if (EXT_VIDEOS.includes(ext)) return "video";
//     return null;
// }

// // Dois arquivos com mesmo nome, tamanho e data de modificação são considerados o mesmo
// function chave(file) {
//     return `${file.name}-${file.size}-${file.lastModified}`;
// }

// function UploadMidia({ fotos, setFotos, videos, setVideos }) {
//     const inputRef = useRef(null);
//     const [aviso, setAviso] = useState("");

//     // Libera da memória as pré-visualizações ao sair da tela
//     const atual = useRef({ fotos, videos });
//     atual.current = { fotos, videos };
//     useEffect(() => {
//         return () => {
//             [...atual.current.fotos, ...atual.current.videos].forEach((m) =>
//                 URL.revokeObjectURL(m.url)
//             );
//         };
//     }, []);

//     const cheio = fotos.length >= MAX_FOTOS && videos.length >= MAX_VIDEOS;

//     // Junta fotos e vídeos numa lista só para mostrar
//     const itens = [
//         ...fotos.map((m) => ({ ...m, tipo: "foto" })),
//         ...videos.map((m) => ({ ...m, tipo: "video" })),
//     ];

//     function escolher(e) {
//         adicionar(Array.from(e.target.files));
//         e.target.value = ""; // permite escolher o mesmo arquivo de novo
//     }

//     function adicionar(novos) {
//         const jaAdicionados = new Set([...fotos, ...videos].map((m) => chave(m.file)));

//         const novasFotos = [];
//         const novosVideos = [];
//         let repetidos = 0;
//         let invalidos = 0;

//         for (const file of novos) {
//             const tipo = tipoDoArquivo(file);
//             if (!tipo) {
//                 invalidos++;
//                 continue;
//             }
//             const k = chave(file);
//             if (jaAdicionados.has(k)) {
//                 repetidos++;
//                 continue;
//             }
//             jaAdicionados.add(k);
//             if (tipo === "foto") novasFotos.push(file);
//             else novosVideos.push(file);
//         }

//         const vagasFotos = MAX_FOTOS - fotos.length;
//         const vagasVideos = MAX_VIDEOS - videos.length;

//         const criar = (file) => ({ file, url: URL.createObjectURL(file) });
//         setFotos([...fotos, ...novasFotos.slice(0, vagasFotos).map(criar)]);
//         setVideos([...videos, ...novosVideos.slice(0, vagasVideos).map(criar)]);

//         const mensagens = [];
//         if (invalidos > 0) mensagens.push(`${invalidos} arquivo(s) com formato não aceito.`);
//         if (repetidos > 0) mensagens.push(`${repetidos} arquivo(s) repetido(s) ignorado(s).`);
//         if (novasFotos.length > vagasFotos) mensagens.push(`Limite de ${MAX_FOTOS} fotos.`);
//         if (novosVideos.length > vagasVideos) mensagens.push(`Limite de ${MAX_VIDEOS} vídeos.`);
//         setAviso(mensagens.join(" "));
//     }

//     function remover(item) {
//         URL.revokeObjectURL(item.url);
//         if (item.tipo === "foto") {
//             setFotos(fotos.filter((m) => m.url !== item.url));
//         } else {
//             setVideos(videos.filter((m) => m.url !== item.url));
//         }
//         setAviso("");
//     }

//     return (
//         <>
//             <style>
//                 {`
//                     .upload-secao {
//                         display: flex;
//                         flex-direction: column;
//                         align-items: center;
//                         gap: 12px;
//                         width: 100%;
//                         max-width: 600px;
//                         margin: 0 auto;
//                     }

//                     .upload-cabecalho {
//                         display: flex;
//                         justify-content: center;
//                         align-items: baseline;
//                         gap: 10px;
//                     }

//                     .upload-titulo {
//                         font-size: 14px;
//                         font-weight: bold;
//                         color: #333333;
//                     }

//                     .upload-contador {
//                         font-size: 12px;
//                         color: #666666;
//                     }

//                     .upload-lista {
//                         display: flex;
//                         flex-wrap: wrap;
//                         justify-content: center;
//                         gap: 10px;
//                     }

//                     .upload-item {
//                         position: relative;
//                         width: 110px;
//                         height: 66px;
//                         border-radius: 6px;
//                         overflow: hidden;
//                         background-color: #000000;
//                     }

//                     .upload-item img,
//                     .upload-item video {
//                         width: 100%;
//                         height: 100%;
//                         object-fit: cover;
//                         display: block;
//                     }

//                     .upload-selo {
//                         position: absolute;
//                         bottom: 3px;
//                         left: 3px;
//                         padding: 2px 4px;
//                         border-radius: 4px;
//                         background-color: rgba(0, 0, 0, 0.65);
//                         color: white;
//                         display: flex;
//                     }

//                     .upload-remover {
//                         position: absolute;
//                         top: 3px;
//                         right: 3px;
//                         width: 18px;
//                         height: 18px;
//                         border: none;
//                         border-radius: 50%;
//                         background-color: rgba(0, 0, 0, 0.65);
//                         color: white;
//                         cursor: pointer;
//                         display: flex;
//                         justify-content: center;
//                         align-items: center;
//                     }

//                     .upload-adicionar {
//                         width: 110px;
//                         height: 66px;
//                         border: 2px dashed #1976d2;
//                         border-radius: 6px;
//                         background-color: transparent;
//                         color: #1976d2;
//                         font-size: 11px;
//                         cursor: pointer;
//                         display: flex;
//                         flex-direction: column;
//                         justify-content: center;
//                         align-items: center;
//                         gap: 2px;
//                     }

//                     .upload-aviso {
//                         color: #d32f2f;
//                         font-size: 13px;
//                         text-align: center;
//                     }
//                 `}
//             </style>

//             <div className="upload-secao">
//                 <div className="upload-cabecalho">
//                     <span className="upload-titulo">Fotos e vídeos</span>
//                     <span className="upload-contador">
//                         Fotos {fotos.length}/{MAX_FOTOS} · Vídeos {videos.length}/{MAX_VIDEOS}
//                     </span>
//                 </div>

//                 <div className="upload-lista">
//                     {itens.map((item) => (
//                         <div className="upload-item" key={item.url}>
//                             {item.tipo === "foto" ? (
//                                 <img src={item.url} alt={item.file.name} />
//                             ) : (
//                                 <>
//                                     <video src={item.url} muted />
//                                     <span className="upload-selo">
//                                         <Video size={12} />
//                                     </span>
//                                 </>
//                             )}
//                             <button
//                                 type="button"
//                                 className="upload-remover"
//                                 onClick={() => remover(item)}
//                                 aria-label="Remover"
//                             >
//                                 <X size={12} />
//                             </button>
//                         </div>
//                     ))}

//                     {!cheio && (
//                         <button
//                             type="button"
//                             className="upload-adicionar"
//                             onClick={() => inputRef.current.click()}
//                         >
//                             <ImagePlus size={20} />
//                             Adicionar mídia
//                         </button>
//                     )}
//                 </div>

//                 {aviso && <p className="upload-aviso">{aviso}</p>}

//                 <input
//                     ref={inputRef}
//                     type="file"
//                     accept=".jpg,.jpeg,.png,.webp,.mp4,.mkv,.webm"
//                     multiple
//                     hidden
//                     onChange={escolher}
//                 />
//             </div>
//         </>
//     );
// }

// export default UploadMidia;