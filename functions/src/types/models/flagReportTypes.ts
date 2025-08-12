export type FlagReportStatus = "unresolved" | "resolved";


import { WithMetadata } from "./utilityTypes";

export interface FlagReportBase {
  content_id: string;
  content_type: string; // e.g., "mold", "moldipedia", etc.
  reporter_id: string;
  reason: string;
  details?: string;
  status: FlagReportStatus;
}

export type FlagReport = WithMetadata<FlagReportBase>;