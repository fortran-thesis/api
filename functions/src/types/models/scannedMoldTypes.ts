import {Timestamp} from "firebase-admin/firestore";

export interface ScannedMold {
  user_id: string;
  image_url: string;
  image_format: string;
  scanned_results: ScannedResult;
}

export interface ScannedResult {
  confidence_score: number;
  flagged: boolean;
}

export interface MonitoredMold {
  user_id: string;
  mold_folder_id: string;
  image_url: string;
  uploaded_at: Timestamp;
  image_format: string;
  surface_area: number;
}
