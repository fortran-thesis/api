import {ReportReason, Role, AuditAction} from "../enums";
import {Timestamp} from "firebase-admin/firestore";

export interface Report {
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  details?: string;
  created_at: Timestamp;
}

export interface AuditLogEntry {
  actor_id: string;
  actor_role: Role;
  action: AuditAction;
  description: string;
  timestamp: Timestamp;
  target_id?: string;
}

export interface MoldReport {
  case_name: string
  date_observed: Timestamp
  user_id: string;
  assigned_mycologist_id: string | null
  reviewed_mycologist_id?: string | null
  reviewed_at?: Timestamp | null
  /** @deprecated Moved to subcollection mold_reports/{id}/case_details — only present in API responses, not in Firestore parent doc */
  case_details?: Array<MoldReportDetails>
  host: string
  location: string
  priority?: "low" | "medium" | "high"
  status: "pending" | "in progress" | "resolved" | "rejected"
  reported_symptoms?: string[];
  reported_signs?: string[];
  reported_characteristics?: string[];
  lookup_results?: Array<{
    moldId: string;
    moldName: string;
    confidence: number;
    timestamp?: Timestamp;
  }>;
  rejection_reason?: string;
}

export interface MoldReportDetails {
  cover_photo?: Array<string>
  description: string
}
