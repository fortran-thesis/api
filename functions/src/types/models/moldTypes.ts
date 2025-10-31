import {Timestamp} from "firebase-admin/firestore";

export interface Mold {
  name: string;
  mold_details: MoldDetails;
}

export interface MoldDetails {
  info: MoldInfo;
  prevention: object
}

export interface MoldInfo {
  description: string;
  taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string
  }
  additional_info: Array<{
    title: string;
    description: string
  }>
}

export interface MoldPrevention {
  fungicide: Array<string>
  additional_info: Array<{
    title: string;
    description: string
  }>
}

export interface MoldCase {
  mycologist_id: string;
  name: string;
  mold_report_id: string;
  photo_url?: string | null;
  priority: "low" | "medium" | "high";
  start_date: Timestamp;
  end_date: Timestamp;
  cultivation_details: CultivationDetails;
  cultivation_logs: Array<CultivationLog>;
  is_archived: boolean;
}

export interface CultivationDetails {
  in_vivo_details: object;
  in_vitro_details: object;
}

export interface CultivationLog {
   type: "vivo" | "vitro";
   characteristics: object;
   additional_info: string;
}
