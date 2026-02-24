import {Timestamp} from "firebase-admin/firestore";

export interface Mold {
  name: string;
  mold_details: MoldDetails;
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
  cultivation_logs?: Array<CultivationLog>;
  is_archived: boolean;
}

export interface CultivationDetails {
  growth_medium: string;
  in_vivo_details: {
    environmental_temperature: number;
  };
  in_vitro_details: {
    incubation_temperature: number;
  };
}

export interface CultivationLog {
  type: "vivo" | "vitro";
  image_url: string;
  characteristics:
    | { lesion_size: number; lesion_color: string }
    | { colony_diameter: number; colony_color: string }; // respective places: vivo | vitro
  additional_info: string;
}
