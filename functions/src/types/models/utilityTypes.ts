import { Timestamp } from "firebase-admin/firestore";

export type WithMetadataAndId<T> = WithId<T> & { metadata: Metadata };
export type WithMetadata<T> = T & { metadata: Metadata };
export type IsCurator<T> = T & { is_verified: boolean };
export type WithId<T> = T & { id: string };

export interface Metadata {
  created_at?: Timestamp;
  updated_at?: Timestamp | null;
  deleted_at?: Timestamp | null;
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string | T;
};
