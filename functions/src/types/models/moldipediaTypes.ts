import {Timestamp} from "firebase-admin/firestore";

export interface Moldipedia {
  title: string;
  body: string;
  author_id: string;
  cover_photo: string;
  tags: string[];
  is_archived: boolean;
  mycologist_id?: string | null;
  approved_at?: Timestamp | null;
}

export interface MoldipediaResponse extends Omit<Moldipedia, "author_id"> {
  author: string;
  mycologist_id?: string | null;
  approved_at?: Timestamp | null;
}
