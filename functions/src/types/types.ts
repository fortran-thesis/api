import { Timestamp } from "firebase-admin/firestore";
import { AuditAction, Role } from "./enums";

export type WithMetadataAndId<T> = WithId<T> & { metadata: Metadata }

export type WithMetadata<T> = T & { metadata: Metadata }

export type IsCurator<T> = T & { is_verified: boolean }

export type WithId<T> = T & { id: string };

export interface Metadata {
  created_at?: Timestamp,
  updated_at?: Timestamp | null,
  deleted_at?: Timestamp | null
}

// USERS
export interface User {
  username: string;
  role: Role;
  is_banned: boolean;
}

export interface UserDetails {
  displayName?: string;
  email?: string;
  disabled: boolean;
}

export interface APIUser {
  user: User,
  details: UserDetails
}

// MOLDS
export interface Mold {
  name: string;
  description: string;
  growth_stage: string;
  photo_url: string[];
}

export interface MoldFolder {
  user_id: string;
  name: string;
  identified_mold: string | null;
  molds: MonitoredMold[];
}

// SCANNED MOLDS
export interface ScannedMold {
  user_id: string;
  image_url: string;
  uploaded_at: Timestamp;
  image_format: string;
  scanned_results: ScannedResult;
}

// SCANNED RESULTS
export interface ScannedResult {
  confidence_score: number;
  flagged: boolean;
}

export interface MonitoredMold {
  user_id: string;
  image_url: string;
  uploaded_at: Timestamp;
  image_format: string;
  surface_area: number
}

// FEEDBACKS
export interface Feedback {
  user_id: string;
  description: string;
  submitted_at: Date;
}

// Generic API response
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string | T;
};

export interface AuditLogEntry {
  actor_id: string;
  actor_role: Role;
  action: AuditAction;
  description: string;
  timestamp: Timestamp;
  target_id?: string;
}