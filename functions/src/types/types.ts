import { Timestamp } from "firebase-admin/firestore";
import { Role } from "./enums";

// USERS
export interface User {
  id: string;
  role: Role;
}

export interface UserDetails {
  displayName?: string;
  email?: string;
}

// MOLDS
export interface Mold {
  id: string;
  name: string;
  description: string;
  growth_stage: string;
  photo_url: string[];
}

// SCANNED MOLDS
export interface ScannedMold {
  id: string;
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

// FEEDBACKS
export interface Feedback {
  id: string;
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
