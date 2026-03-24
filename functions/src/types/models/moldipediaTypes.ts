import {Timestamp} from "firebase-admin/firestore";

export interface Moldipedia {
  title: string;
  body: string;
  author_id: string;
  cover_photo: string;
  tags: string[];
  is_archived: boolean;
  mold_type?: string;
  affected_hosts?: string;
  symptoms?: string;
  disease_cycle?: string;
  impact?: string;
  prevention?: string;
  treatments?: {
    mechanical?: string;
    cultural?: string;
    biological?: string;
    physical?: string;
    chemical?: string;
  };
  findings?: Array<{
    title: string;
    content: string;
  }>;
  mycologist_id?: string | null;
  approved_at?: Timestamp | null;
}

export interface MoldipediaResponse extends Omit<Moldipedia, "author_id"> {
  author: string;
  mycologist_id?: string | null;
  approved_at?: Timestamp | null;
}
