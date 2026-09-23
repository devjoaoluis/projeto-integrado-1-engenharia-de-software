export interface IFileStorage {
  save(sourcePath: string, destinationDir: string, fileName: string): Promise<string>;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  getPath(destinationDir: string, fileName: string): string;
}
