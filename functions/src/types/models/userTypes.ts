import { Role } from "../enums";

export interface User {
  username: string;
  role: Role;
  is_banned: boolean;
}

export interface UserDetails {
  displayName?: string;
  email?: string;
  photo_url: string;
  disabled: boolean;
}

export interface APIUser {
  user: User;
  details: UserDetails;
}
