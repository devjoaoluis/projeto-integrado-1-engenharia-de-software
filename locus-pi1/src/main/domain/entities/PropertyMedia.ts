export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
}

export interface PropertyMedia {
  id: string;
  propertyId: string;
  type: MediaType;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
}
