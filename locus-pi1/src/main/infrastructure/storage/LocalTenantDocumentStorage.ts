import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { ITenantDocumentStorage } from "../../domain/repositories/ITenantDocumentStorage";

export class LocalTenantDocumentStorage implements ITenantDocumentStorage {
  private rootDirectory: string;

  constructor(customBaseDir?: string) {
    if (customBaseDir) {
      this.rootDirectory = path.resolve(customBaseDir);
    } else {
      let userDataPath = "";
      try {
        userDataPath = app.getPath("userData");
      } catch {
        userDataPath = path.join(process.cwd(), "userData");
      }
      this.rootDirectory = path.resolve(userDataPath, "documentos");
    }
  }

  private resolveSafe(relativePath: string): string {
    const root = path.resolve(this.rootDirectory);
    const target = path.resolve(root, relativePath);
    if (!target.startsWith(root) || target === root) {
      throw new Error("Acesso a caminho de arquivo não autorizado.");
    }
    return target;
  }

  async save(locatarioId: string, fileName: string, content: Uint8Array | Buffer): Promise<string> {
    const relativePath = path.join(locatarioId, fileName).replace(/\\/g, "/");
    const absPath = this.resolveSafe(relativePath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, Buffer.from(content));
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    const absPath = this.resolveSafe(relativePath);
    try {
      return await fs.readFile(absPath);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error?.code === "ENOENT") {
        throw new Error("ARQUIVO_NAO_ENCONTRADO: Arquivo não encontrado no disco.");
      }
      throw err;
    }
  }

  async delete(relativePath: string): Promise<void> {
    const absPath = this.resolveSafe(relativePath);
    await fs.rm(absPath, { force: true });
  }

  async copyTo(relativePath: string, destinationPath: string): Promise<void> {
    const absPath = this.resolveSafe(relativePath);
    try {
      const stat = await fs.stat(absPath);
      if (!stat.isFile()) {
        throw new Error("ARQUIVO_NAO_ENCONTRADO: Arquivo não encontrado no disco.");
      }
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error?.code === "ENOENT") {
        throw new Error("ARQUIVO_NAO_ENCONTRADO: Arquivo não encontrado no disco.");
      }
      throw err;
    }
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(absPath, destinationPath);
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const absPath = this.resolveSafe(relativePath);
      await fs.access(absPath);
      return true;
    } catch {
      return false;
    }
  }

  getAbsolutePath(relativePath: string): string {
    return this.resolveSafe(relativePath);
  }
}
