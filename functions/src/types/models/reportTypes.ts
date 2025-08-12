import { ReportReason, Role, AuditAction } from "../enums";
import { Timestamp } from "firebase-admin/firestore";

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
