export interface Mold {
  name: string;
  description: string;
  growth_stage: string;
  photo_url: string[];
}

export interface MoldFolder {
  user_id: string;
  name: string;
  photo_url: string;
  identified_mold: string | null;
  is_archived: boolean;
}
