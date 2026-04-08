import {Timestamp} from "firebase-admin/firestore";

export interface ScannedMold {
  user_id: string;
  image_url: string;
  image_format: string;
  scan_modality: ScanModality;
  source_flow: ScanSourceFlow;
  source_tab?: ScanSourceTab;
  mold_id?: string | null;
  predicted_class_name?: string;
  corrected_genus?: string;
  corrected_predicted_class_name?: string | null;
  corrected_by_user_id?: string;
  corrected_at?: Timestamp;
  mold_case_id?: string;
  captured_at?: Timestamp;
  scanned_results: ScannedResult;
}

export type ScanModality = "microscopic" | "macroscopic";
export type ScanSourceFlow = "identification" | "monitoring_initial" | "cultivation_log";
export type ScanSourceTab = "in-vivo" | "in-vitro";

export interface ScannedMoldQueryFilters {
  mold_case_id?: string;
  scan_modality?: ScanModality;
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
