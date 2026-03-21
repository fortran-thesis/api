import {Timestamp} from "firebase-admin/firestore";

export interface Mold {
  name: string;
  mold_details: MoldDetails;
  symptoms?: string[];
  signs?: string[];
  characteristics?: string[];
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
  user_name?: string;
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
    moldId: string;
    moldName: string;
    confidence: number;
    mycologist_notes?: string;
    verdict_timestamp?: Timestamp;
  };
}

export interface CultivationDetails {
  growth_medium: string;
  in_vivo_details: {
    environmental_temperature: number;
  };
  in_vitro_details: {
    incubation_temperature: number;
  };
  specimen_types?: string[];
  specimen_quantities?: string[];
  specimen_types_csv?: string;
  specimen_quantities_csv?: string;
  initial_symptoms?: string[];
  initial_symptoms_csv?: string;
  initial_characteristics?: string[];
  initial_characteristics_csv?: string;
  location_gathered?: string;
  initial_microscopic?: string;
  initial_macroscopic?: string;
  initial_microscopic_color?: string;
  initial_microscopic_texture?: string;
  initial_macroscopic_color?: string;
  initial_macroscopic_texture?: string;
  initial_macroscopic_symptoms?: string;
  initial_macroscopic_characteristics?: string;
  initial_microscopic_image_url?: string;
  initial_macroscopic_image_url?: string;
  date_observation?: string;
  microscopic_ai_snapshot?: Record<string, unknown>;
  scanned_microscopic_ids?: string[];
  scanned_macroscopic_ids?: string[];
}

export interface CultivationLog {
  type: "vivo" | "vitro";
  image_url: string;
  characteristics:
    | { lesion_size: number; lesion_color: string }
    | { colony_diameter: number; colony_color: string }; // respective places: vivo | vitro
  additional_info: string;
}
