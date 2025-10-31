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
  case_details: Array<MoldReportDetails>
  host: string
  status: "pending" | "in progress" | "resolved" | "closed"
}

export interface MoldReportDetails {
  cover_photo?: Array<string>
  description: string
}
