export interface ITenantDocumentStorage {
  save(locatarioId: string, fileName: string, content: Uint8Array | Buffer): Promise<string>;
  read(relativePath: string): Promise<Buffer>;
  delete(relativePath: string): Promise<void>;
  copyTo(relativePath: string, destinationPath: string): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
  getAbsolutePath(relativePath: string): string;
}
