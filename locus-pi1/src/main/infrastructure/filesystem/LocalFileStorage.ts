import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { IFileStorage } from "../../domain/repositories/IFileStorage";

export class LocalFileStorage implements IFileStorage {
  private get baseDir(): string {
    // We only access app.getPath inside methods to allow tests to run without Electron
    // If not in Electron, we fallback to a local temp dir (for tests)
    if (app && app.getPath) {
      return app.getPath("userData");
    }
    return path.join(process.cwd(), "test-userdata");
  }

  public getPath(destinationDir: string, fileName: string): string {
    return path.join(this.baseDir, destinationDir, fileName);
  }

  public async save(sourcePath: string, destinationDir: string, fileName: string): Promise<string> {
    const destPath = this.getPath(destinationDir, fileName);
    const destFolder = path.dirname(destPath);
    
    await fs.mkdir(destFolder, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
    
    return destPath;
  }

  public async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  public async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
