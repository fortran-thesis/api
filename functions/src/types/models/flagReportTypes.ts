export type FlagReportStatus = "unresolved" | "resolved";

export interface FlagReportBase {
  content_id: string;
  content_type: string; // e.g., "mold", "moldipedia", etc.
  reporter_id: string;
  reason: string;
  details?: string;
  status: FlagReportStatus;
}
