import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";
import { InspectionDetails, InspectionMedia } from "../../domain/entities/Inspection";
import { MediaType } from "../../domain/entities/PropertyMedia";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IFileStorage } from "../../domain/repositories/IFileStorage";

const schema = z.object({
  propertyId: z.string().trim().min(1),
  contractId: z.string().trim().min(1),
  inspectedAt: z.number().int().min(0).max(8640000000000000),
  description: z.string().trim().min(1),
  reportReference: z.string().trim().min(1).nullable().optional(),
  sourceFilePaths: z.array(z.string().trim().min(1)).default([]),
}).strict();
export type RecordEntryInspectionDTO = z.input<typeof schema>;

const fileTypes: Record<string, { type: MediaType; mimeType: string }> = {
  ".jpg": { type: MediaType.IMAGE, mimeType: "image/jpeg" },
  ".jpeg": { type: MediaType.IMAGE, mimeType: "image/jpeg" },
  ".png": { type: MediaType.IMAGE, mimeType: "image/png" },
  ".webp": { type: MediaType.IMAGE, mimeType: "image/webp" },
  ".mp4": { type: MediaType.VIDEO, mimeType: "video/mp4" },
  ".mkv": { type: MediaType.VIDEO, mimeType: "video/x-matroska" },
  ".webm": { type: MediaType.VIDEO, mimeType: "video/webm" },
};

export class RecordEntryInspection {
  constructor(
    private inspectionRepository: IInspectionRepository,
    private propertyRepository: IPropertyRepository,
    private historyRepository: IPropertyHistoryRepository,
    private fileStorage: IFileStorage,
  ) {}

  async execute(input: RecordEntryInspectionDTO): Promise<InspectionDetails> {
    const data = schema.parse(input);
    const createdAt = Date.now();
    if (data.inspectedAt > createdAt) throw new Error("A data da vistoria não pode estar no futuro.");
    if (!await this.propertyRepository.findById(data.propertyId)) throw new Error("Imóvel não encontrado.");
    const contract = await this.historyRepository.findContractById(data.contractId);
    if (!contract || contract.propertyId !== data.propertyId) throw new Error("O contrato deve pertencer ao imóvel da vistoria.");
    if (contract.status === "CANCELLED") throw new Error("Não é possível registrar vistoria de entrada para um contrato cancelado.");

    // Validate every source before copying any file. Contents are not loaded into memory.
    const sources = [];
    for (const sourceFilePath of data.sourceFilePaths) {
      const extension = path.extname(sourceFilePath).toLowerCase();
      const format = fileTypes[extension];
      if (!format) throw new Error("Formato inválido. Anexe fotos JPG, JPEG, PNG, WEBP ou vídeos MP4, MKV, WEBM.");
      const stat = await fs.stat(sourceFilePath).catch((): null => null);
      if (!stat?.isFile() || stat.size === 0) throw new Error("O anexo deve ser um arquivo existente e não vazio.");
      sources.push({ sourceFilePath, extension, size: stat.size, ...format });
    }
    const id = randomUUID();
    const destinationDir = path.join("media", "inspections", id);
    const copiedPaths: string[] = [];
    const media: InspectionMedia[] = [];
    try {
      for (const source of sources) {
        const mediaId = randomUUID();
        const fileName = `${mediaId}${source.extension}`;
        const destinationPath = this.fileStorage.getPath(destinationDir, fileName);
        copiedPaths.push(destinationPath);
        const filePath = await this.fileStorage.save(source.sourceFilePath, destinationDir, fileName);
        copiedPaths[copiedPaths.length - 1] = filePath;
        media.push({ id: mediaId, inspectionId: id, type: source.type, fileName, filePath,
          mimeType: source.mimeType, size: source.size, createdAt });
      }
      return await this.inspectionRepository.create({ id, propertyId: data.propertyId, contractId: data.contractId,
        type: "ENTRY", inspectedAt: data.inspectedAt, description: data.description,
        reportReference: data.reportReference ?? null, createdAt }, media);
    } catch (error) {
      for (const filePath of copiedPaths) {
        try { await this.fileStorage.delete(filePath); }
        catch (cleanupError) { console.error("Falha ao remover anexo de vistoria após erro:", cleanupError); }
      }
      throw error;
    }
  }
}
