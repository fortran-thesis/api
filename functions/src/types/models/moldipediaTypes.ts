export interface Moldipedia {
  title: string;
  body: string;
  author_id: string;
  cover_photo: string;
  tags: string[];
}

export interface MoldipediaResponse extends Omit<Moldipedia, "author_id"> {
  author: string;
}
