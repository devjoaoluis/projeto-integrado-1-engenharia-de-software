import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { UploadTenantDocument, MAX_FILE_SIZE } from "../../../application/use-cases/tenant-documents/UploadTenantDocument";
import { ListTenantDocuments } from "../../../application/use-cases/tenant-documents/ListTenantDocuments";
import { GetTenantDocument } from "../../../application/use-cases/tenant-documents/GetTenantDocument";
import { DownloadTenantDocument } from "../../../application/use-cases/tenant-documents/DownloadTenantDocument";
import { UpdateTenantDocumentCategory } from "../../../application/use-cases/tenant-documents/UpdateTenantDocumentCategory";
import { TenantDocument } from "../../../domain/entities/TenantDocument";

const sqlite = createClient({ url: "file::memory:" });
const dbModule = require.resolve("../../database/db");
const previousDb = require.cache[dbModule];
require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;

// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleTenantDocumentRepository } = require("../DrizzleTenantDocumentRepository") as typeof import("../DrizzleTenantDocumentRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleClientRepository } = require("../DrizzleClientRepository") as typeof import("../DrizzleClientRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated storage
const { LocalTenantDocumentStorage } = require("../../storage/LocalTenantDocumentStorage") as typeof import("../../storage/LocalTenantDocumentStorage");

let tempDir: string;
let storageDir: string;
let storage: InstanceType<typeof LocalTenantDocumentStorage>;
let documentRepo: InstanceType<typeof DrizzleTenantDocumentRepository>;
let clientRepo: InstanceType<typeof DrizzleClientRepository>;
let uploadUseCase: UploadTenantDocument;
let listUseCase: ListTenantDocuments;
let getUseCase: GetTenantDocument;
let updateCategoryUseCase: UpdateTenantDocumentCategory;

const samplePdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
const sampleJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const samplePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

before(async () => {
  await initializeDatabase(sqlite);
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "locus-tenant-docs-"));
  storageDir = path.join(tempDir, "documentos");
  storage = new LocalTenantDocumentStorage(storageDir);
  documentRepo = new DrizzleTenantDocumentRepository();
  clientRepo = new DrizzleClientRepository();
  uploadUseCase = new UploadTenantDocument(documentRepo, clientRepo, storage);
  listUseCase = new ListTenantDocuments(documentRepo, clientRepo);
  getUseCase = new GetTenantDocument(documentRepo, storage);
  updateCategoryUseCase = new UpdateTenantDocumentCategory(documentRepo);
});

beforeEach(async () => {
  await fs.rm(storageDir, { recursive: true, force: true });
  await fs.mkdir(storageDir, { recursive: true });
  await sqlite.executeMultiple(`
    DELETE FROM tenant_documents;
    DELETE FROM property_contracts;
    DELETE FROM rentals;
    DELETE FROM clients;
    INSERT INTO clients (id, name, cpf_cnpj, phone, email, type, created_at, updated_at)
    VALUES ('tenant-1', 'Locatário Principal', '111.111.111-11', '1199999999', 'locatario1@email.com', 'TENANT', 1, 1),
           ('tenant-2', 'Segundo Locatário', '222.222.222-22', '1188888888', 'locatario2@email.com', 'TENANT', 1, 1);
  `);
});

after(async () => {
  sqlite.close();
  if (previousDb) require.cache[dbModule] = previousDb;
  else delete require.cache[dbModule];
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
});

describe("HU-13 Tenant Documents Backend", () => {
  it("uploads valid PDF, JPG and PNG files successfully", async () => {
    // 1. PDF
    const pdfDoc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "rg_locatario.pdf",
      conteudo: samplePdf,
      categoria: "identificacao",
    });
    assert.equal(pdfDoc.locatarioId, "tenant-1");
    assert.equal(pdfDoc.nomeOriginal, "rg_locatario.pdf");
    assert.equal(pdfDoc.mimeType, "application/pdf");
    assert.equal(pdfDoc.categoria, "identificacao");
    assert.equal(pdfDoc.tamanhoBytes, samplePdf.length);
    assert.ok(pdfDoc.caminhoArquivo.startsWith("tenant-1/"));
    assert.ok(await storage.exists(pdfDoc.caminhoArquivo));

    // 2. JPG
    const jpgDoc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "foto_cnh.jpg",
      conteudo: sampleJpg,
      categoria: "identificacao",
    });
    assert.equal(jpgDoc.mimeType, "image/jpeg");
    assert.ok(await storage.exists(jpgDoc.caminhoArquivo));

    // 3. PNG (default category: outros)
    const pngDoc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "comprovante_renda.png",
      conteudo: samplePng,
    });
    assert.equal(pngDoc.mimeType, "image/png");
    assert.equal(pngDoc.categoria, "outros");
    assert.ok(await storage.exists(pngDoc.caminhoArquivo));
  });

  it("rejects invalid extensions, divergent mimeType and divergent magic bytes", async () => {
    // Extensão inválida (.txt)
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "anotacao.txt",
        conteudo: Buffer.from("Texto qualquer"),
      }),
      /Formato não suportado/
    );

    // MimeType divergente da extensão
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "documento.pdf",
        conteudo: samplePdf,
        mimeType: "image/png",
      }),
      /Divergência/
    );

    // Magic bytes divergentes: extensão .pdf mas conteúdo JPG
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "falso.pdf",
        conteudo: sampleJpg,
      }),
      /magic bytes/
    );

    // Magic bytes divergentes: extensão .png mas conteúdo PDF
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "falso.png",
        conteudo: samplePdf,
      }),
      /magic bytes/
    );
  });

  it("rejects empty files and files exceeding 10 MB", async () => {
    // Arquivo vazio
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "vazio.pdf",
        conteudo: Buffer.alloc(0),
      }),
      /vazio/
    );

    // Arquivo acima de 10 MB
    const oversized = Buffer.concat([samplePdf, Buffer.alloc(MAX_FILE_SIZE)]);
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "grande.pdf",
        conteudo: oversized,
      }),
      /limite máximo/
    );
  });

  it("rejects non-existent locatarioId", async () => {
    await assert.rejects(
      uploadUseCase.execute({
        locatarioId: "inexistente-999",
        nomeArquivo: "doc.pdf",
        conteudo: samplePdf,
      }),
      /Locatário não encontrado/
    );
  });

  it("sanitizes filename and prevents directory path traversal", async () => {
    const doc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "../../../etc/passwd/meu..documento.pdf",
      conteudo: samplePdf,
    });
    // O nome deve ser sanitizado sem "../" ou barras
    assert.equal(doc.nomeOriginal, "meu.documento.pdf");
    assert.ok(!doc.caminhoArquivo.includes(".."));
    assert.ok(doc.caminhoArquivo.startsWith("tenant-1/"));
  });

  it("rolls back stored file if database insertion fails", async () => {
    const failingRepo = new (class extends DrizzleTenantDocumentRepository {
      async create(): Promise<TenantDocument> {
        throw new Error("Erro simulado de banco de dados");
      }
    })();

    const useCaseWithFailingRepo = new UploadTenantDocument(failingRepo, clientRepo, storage);

    await assert.rejects(
      useCaseWithFailingRepo.execute({
        locatarioId: "tenant-1",
        nomeArquivo: "documento.pdf",
        conteudo: samplePdf,
      }),
      /Erro simulado de banco de dados/
    );

    // Garante que nenhum arquivo ficou órfão no diretório de armazenamento
    const files = await fs.readdir(storageDir, { recursive: true });
    const savedFiles = files.filter((f) => String(f).endsWith(".pdf"));
    assert.equal(savedFiles.length, 0);
  });

  it("lists documents isolated by tenant and ordered descending by created date", async () => {
    // Inserir documentos em momentos diferentes
    await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "primeiro.pdf",
      conteudo: samplePdf,
    });
    // Pequeno atraso para garantir timestamps distintos
    await new Promise((r) => setTimeout(r, 15));
    await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "segundo.png",
      conteudo: samplePng,
    });
    // Documento de outro locatário
    await uploadUseCase.execute({
      locatarioId: "tenant-2",
      nomeArquivo: "outro_tenant.pdf",
      conteudo: samplePdf,
    });

    const docsTenant1 = await listUseCase.execute({ locatarioId: "tenant-1" });
    assert.equal(docsTenant1.length, 2);
    assert.equal(docsTenant1[0].nomeOriginal, "segundo.png");
    assert.equal(docsTenant1[1].nomeOriginal, "primeiro.pdf");

    const docsTenant2 = await listUseCase.execute({ locatarioId: "tenant-2" });
    assert.equal(docsTenant2.length, 1);
    assert.equal(docsTenant2[0].nomeOriginal, "outro_tenant.pdf");

    // Tentativa com locatário inexistente
    await assert.rejects(listUseCase.execute({ locatarioId: "missing" }), /Locatário não encontrado/);
  });

  it("retrieves document content (bytes + mimeType) by ID and handles missing file", async () => {
    const doc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "visualizar.pdf",
      conteudo: samplePdf,
    });

    const retrieved = await getUseCase.execute({ id: doc.id });
    assert.equal(retrieved.mimeType, "application/pdf");
    assert.equal(retrieved.nomeOriginal, "visualizar.pdf");
    assert.deepEqual(Buffer.from(retrieved.conteudo), samplePdf);

    // ID inexistente
    await assert.rejects(getUseCase.execute({ id: "missing" }), /Documento não encontrado/);

    // Se o arquivo for excluído fisicamente do disco
    await storage.delete(doc.caminhoArquivo);
    await assert.rejects(getUseCase.execute({ id: doc.id }), /ARQUIVO_NAO_ENCONTRADO/);

    // A listagem deve continuar funcionando mesmo com arquivo ausente no disco
    const list = await listUseCase.execute({ locatarioId: "tenant-1" });
    assert.ok(list.some((d) => d.id === doc.id));
  });

  it("downloads document to destination and handles cancellation without error", async () => {
    const doc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "baixar.pdf",
      conteudo: samplePdf,
    });

    const downloadDest = path.join(tempDir, "destino_copia.pdf");

    // Caso de sucesso
    const customSaveDialog = async (suggested: string, ext: string) => {
      assert.equal(suggested, "baixar.pdf");
      assert.equal(ext, "pdf");
      return { canceled: false, filePath: downloadDest };
    };

    const downloadWithMock = new DownloadTenantDocument(documentRepo, storage, customSaveDialog);
    const result = await downloadWithMock.execute({ id: doc.id });
    assert.equal(result.salvo, true);
    assert.equal(result.destino, downloadDest);
    assert.deepEqual(await fs.readFile(downloadDest), samplePdf);

    // Caso de cancelamento
    const cancelSaveDialog = async () => ({ canceled: true });
    const downloadCancelled = new DownloadTenantDocument(documentRepo, storage, cancelSaveDialog);
    const cancelResult = await downloadCancelled.execute({ id: doc.id });
    assert.equal(cancelResult.salvo, false);
    assert.equal(cancelResult.destino, undefined);

    // Documento com arquivo ausente no disco
    await storage.delete(doc.caminhoArquivo);
    await assert.rejects(downloadWithMock.execute({ id: doc.id }), /ARQUIVO_NAO_ENCONTRADO/);
  });

  it("updates document category and rejects invalid categories", async () => {
    const doc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "recibo.pdf",
      conteudo: samplePdf,
      categoria: "outros",
    });

    const updated = await updateCategoryUseCase.execute({
      id: doc.id,
      categoria: "comprovante_renda",
    });
    assert.equal(updated.categoria, "comprovante_renda");

    const inDb = await documentRepo.findById(doc.id);
    assert.equal(inDb?.categoria, "comprovante_renda");

    // Categoria inválida
    await assert.rejects(
      updateCategoryUseCase.execute({
        id: doc.id,
        // @ts-expect-error testando categoria invalida em runtime
        categoria: "categoria_inexistente",
      })
    );
  });

  it("cascades deletion when the tenant client is deleted from database", async () => {
    const doc = await uploadUseCase.execute({
      locatarioId: "tenant-1",
      nomeArquivo: "rg.pdf",
      conteudo: samplePdf,
    });

    assert.ok(await documentRepo.findById(doc.id));

    // Deletar o cliente com chave estrangeira ON DELETE CASCADE
    await sqlite.execute("DELETE FROM clients WHERE id = 'tenant-1'");

    // O registro em tenant_documents deve ter sido excluído automaticamente
    const afterDelete = await documentRepo.findById(doc.id);
    assert.equal(afterDelete, null);
  });
});

it("registers all 5 IPC handlers for tenant documents (documentos:*)", async () => {
  const electronModule = require.resolve("electron");
  const previous = require.cache[electronModule];
  const handlers = new Map<string, (event: unknown, data: unknown) => Promise<unknown>>();
  require.cache[electronModule] = {
    exports: {
      ipcMain: {
        handle: (name: string, handler: (event: unknown, data: unknown) => Promise<unknown>) =>
          handlers.set(name, handler),
      },
      app: { getPath: () => storageDir },
      dialog: {
        showSaveDialog: async () => ({ canceled: true }),
      },
    },
  } as NodeModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate Electron IPC
    require("../../../ipc/tenant-documents.ipc").registerTenantDocumentsIpc(storageDir, async () => ({ canceled: true }));

    const registeredKeys = [...handlers.keys()].sort();
    assert.deepEqual(registeredKeys, [
      "documentos:atualizar-categoria",
      "documentos:baixar",
      "documentos:listar",
      "documentos:obter",
      "documentos:upload",
    ]);

    // Testar upload via IPC handler
    const uploaded = (await handlers.get("documentos:upload")(
      {},
      {
        locatarioId: "tenant-2",
        nomeArquivo: "ipc_teste.pdf",
        conteudo: samplePdf,
        categoria: "contrato",
      }
    )) as TenantDocument;

    assert.equal(uploaded.nomeOriginal, "ipc_teste.pdf");
    assert.equal(uploaded.categoria, "contrato");

    // Testar listagem via IPC
    const list = (await handlers.get("documentos:listar")(
      {},
      { locatarioId: "tenant-2" }
    )) as TenantDocument[];
    assert.equal(list.length, 1);

    // Testar obter via IPC
    const obtained = (await handlers.get("documentos:obter")(
      {},
      { id: uploaded.id }
    )) as { mimeType: string; conteudo: Uint8Array };
    assert.equal(obtained.mimeType, "application/pdf");

    // Testar atualizar categoria via IPC
    const updated = (await handlers.get("documentos:atualizar-categoria")(
      {},
      { id: uploaded.id, categoria: "antecedentes" }
    )) as TenantDocument;
    assert.equal(updated.categoria, "antecedentes");

    // Testar baixar cancelado via IPC
    const download = (await handlers.get("documentos:baixar")(
      {},
      { id: uploaded.id }
    )) as { salvo: boolean };
    assert.equal(download.salvo, false);
  } finally {
    if (previous) require.cache[electronModule] = previous;
    else delete require.cache[electronModule];
  }
});
