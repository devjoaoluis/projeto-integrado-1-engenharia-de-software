import { PropertyInspection } from "./PropertyHistory";
import { MediaType } from "./PropertyMedia";

export interface Inspection extends PropertyInspection {
  contractId: string;
  type: "ENTRY" | "EXIT";
}

export interface InspectionMedia {
  id: string;
  inspectionId: string;
  type: MediaType;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface InspectionDetails extends Inspection {
  media: InspectionMedia[];
}
