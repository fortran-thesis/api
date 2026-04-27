import {Timestamp} from "firebase-admin/firestore";

export enum MoldStatus {
  Draft = "draft",
  Reviewed = "reviewed",
}

export interface Mold {
  name: string;
  mold_details: MoldDetails;
  symptoms?: string[];
  signs?: string[];
  characteristics?: string[];
  moldipedia_id?: string;
  status?: MoldStatus;
}

export interface MoldDetails {
  info: MoldInfo;
  prevention: MoldPrevention;
}

export interface MoldInfo {
  description: string;
  taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
  };
  // direct structured fields for moldipedia consistency
  overview?: string;
  health_risks?: string;
  affected_hosts?: string;
  symptoms_and_signs?: string;
  disease_cycle_spread_impact?: string;
  prevention_summary?: string;
  additional_info: Array<{
    title: string;
    description: string;
  }>;
  predicted_class_id?: number;
  predicted_class_name?: string;
}

export interface MoldPrevention {
  physicalControl: string;
  mechanicalControl: string;
  culturalControl: string;
  biologicalControl: string;
  chemicalControl: string;
}

export interface MoldCase {
  user_id?: string;
  mycologist_id: string;
  name: string;
  mold_report_id: string;
  photo_url?: string | null;
  priority: "low" | "medium" | "high";
  start_date: Timestamp;
  end_date: Timestamp;
  cultivation_details?: CultivationDetails;
  is_archived: boolean;
  final_verdict?: {
    moldId: string | null;
    confidence: number;
    moldipedia_id?: string;
    mycologist_notes?: string;
    verdict_timestamp?: Timestamp;
    verdict_fallback_name?: string;
  };
}

export type MoldCaseResponse = MoldCase & {
  user_name?: string;
  mycologist_name?: string;
  final_verdict?: NonNullable<MoldCase["final_verdict"]> & {
    moldName?: string;
  };
};

export interface CultivationDetails {
  specimen_type?: string;
  specimen_quantity?: number;
  location_gathered?: string;
  date_observation?: string;
  scanned_microscopic_ids?: string[];
  scanned_macroscopic_ids?: string[];
  initial_observations?: InitialObservations;
}

export interface InitialObservations {
  microscopic_description?: string;
  microscopic_color?: string;
  microscopic_texture?: string;
  microscopic_image_path?: string;
  macroscopic_description?: string;
  macroscopic_color?: string;
  macroscopic_texture?: string;
  macroscopic_symptoms?: string;
  macroscopic_characteristics?: string;
  macroscopic_image_path?: string;
  symptoms?: string[];
  signs?: string[];
  characteristics?: string[];
  ai_snapshot?: MicroscopicAiSnapshot;
}

export interface MicroscopicAiSnapshot {
  identified_mold?: string;
  mold_id?: string;
  confidence?: number;
  confidence_display?: string;
  model_source?: string;
  captured_at?: string;
  used_ann?: boolean;
  used_fusion?: boolean;
  top_predictions?: Array<{
    moldId: string;
    moldName: string;
    confidence: number;
  }>;
}

export interface CultivationLogCharacteristics {
  size?: string;
  color?: string;
  texture?: string;
  symptoms?: string[] | string;
  signs?: string[] | string;
  characteristics?: string[] | string;
  lesion_size?: number;
  lesion_color?: string;
  lesion_texture?: string;
  environmental_temperature?: number;
  colony_diameter?: number;
  colony_color?: string;
  colony_texture?: string;
  incubation_temperature?: number;
  culture_id?: string;
  culture_name?: string;
  [key: string]: unknown;
}

export interface CultivationLog {
  type: "vivo" | "vitro";
  image_url: string;
  growth_medium?: string;
  characteristics: CultivationLogCharacteristics;
  additional_info: string;
}

export type CultureSessionStatus = "incubating" | "available" | "ended_early";

export interface CultureSession {
  case_id: string;
  name: string;
  target_at: Timestamp;
  ended_at?: Timestamp | null;
  deleted_at?: Timestamp | null;
}
