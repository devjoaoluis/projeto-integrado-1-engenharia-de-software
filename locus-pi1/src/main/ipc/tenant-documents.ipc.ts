import { ipcMain } from "electron";
import { UploadTenantDocument, UploadTenantDocumentDTO } from "../application/use-cases/tenant-documents/UploadTenantDocument";
import { ListTenantDocuments, ListTenantDocumentsDTO } from "../application/use-cases/tenant-documents/ListTenantDocuments";
import { GetTenantDocument, GetTenantDocumentDTO } from "../application/use-cases/tenant-documents/GetTenantDocument";
import { DownloadTenantDocument, DownloadTenantDocumentDTO, SaveDialogFunction } from "../application/use-cases/tenant-documents/DownloadTenantDocument";
import { UpdateTenantDocumentCategory, UpdateTenantDocumentCategoryDTO } from "../application/use-cases/tenant-documents/UpdateTenantDocumentCategory";
import { DrizzleTenantDocumentRepository } from "../infrastructure/repositories/DrizzleTenantDocumentRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { LocalTenantDocumentStorage } from "../infrastructure/storage/LocalTenantDocumentStorage";

export function registerTenantDocumentsIpc(storageCustomDir?: string, saveDialogFn?: SaveDialogFunction) {
  const documentRepo = new DrizzleTenantDocumentRepository();
  const clientRepo = new DrizzleClientRepository();
  const storage = new LocalTenantDocumentStorage(storageCustomDir);

  const uploadUseCase = new UploadTenantDocument(documentRepo, clientRepo, storage);
  const listUseCase = new ListTenantDocuments(documentRepo, clientRepo);
  const getUseCase = new GetTenantDocument(documentRepo, storage);
  const downloadUseCase = new DownloadTenantDocument(documentRepo, storage, saveDialogFn);
  const updateCategoryUseCase = new UpdateTenantDocumentCategory(documentRepo);

  ipcMain.handle("documentos:upload", (_, data: UploadTenantDocumentDTO) =>
    uploadUseCase.execute(data)
  );

  ipcMain.handle("documentos:listar", (_, data: ListTenantDocumentsDTO) =>
    listUseCase.execute(data)
  );

  ipcMain.handle("documentos:obter", (_, data: GetTenantDocumentDTO) =>
    getUseCase.execute(data)
  );

  ipcMain.handle("documentos:baixar", (_, data: DownloadTenantDocumentDTO) =>
    downloadUseCase.execute(data)
  );

  ipcMain.handle("documentos:atualizar-categoria", (_, data: UpdateTenantDocumentCategoryDTO) =>
    updateCategoryUseCase.execute(data)
  );
}
