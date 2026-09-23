import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { PropertyMedia, MediaType } from "../../domain/entities/PropertyMedia";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyMediaRepository } from "../../domain/repositories/IPropertyMediaRepository";
import { IFileStorage } from "../../domain/repositories/IFileStorage";

export interface AddPropertyMediaDTO {
  propertyId: string;
  sourceFilePath: string;
}

export class AddPropertyMedia {
  constructor(
    private propertyRepository: IPropertyRepository,
    private propertyMediaRepository: IPropertyMediaRepository,
    private fileStorage: IFileStorage
  ) {}

  async execute(dto: AddPropertyMediaDTO): Promise<PropertyMedia> {
    const property = await this.propertyRepository.findById(dto.propertyId);
    if (!property) {
      throw new Error(`Property with id ${dto.propertyId} not found`);
    }

    let stat;
    try {
      stat = await fs.stat(dto.sourceFilePath);
    } catch {
      throw new Error("Source file does not exist");
    }

    const ext = path.extname(dto.sourceFilePath).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    const isVideo = [".mp4", ".mkv", ".webm"].includes(ext);

    if (!isImage && !isVideo) {
      throw new Error("Invalid file type. Only images and videos are allowed.");
    }

    const type = isImage ? MediaType.IMAGE : MediaType.VIDEO;
    
    // Generate new file name and destination
    const uuid = randomUUID();
    const newFileName = `${uuid}${ext}`;
    const destinationDir = path.join("media", "properties", dto.propertyId);

    // Copy file
    const newFilePath = await this.fileStorage.save(dto.sourceFilePath, destinationDir, newFileName);

    let mimeType = "application/octet-stream";
    if (isImage) mimeType = `image/${ext.substring(1)}`;
    if (isVideo) mimeType = `video/${ext.substring(1)}`;

    const media: PropertyMedia = {
      id: uuid,
      propertyId: dto.propertyId,
      type,
      fileName: newFileName,
      filePath: newFilePath,
      mimeType,
      size: stat.size,
      createdAt: Date.now(),
    };

    try {
      return await this.propertyMediaRepository.create(media);
    } catch (error) {
      // If DB insert fails, rollback file copy
      await this.fileStorage.delete(newFilePath);
      throw error;
    }
  }
}
