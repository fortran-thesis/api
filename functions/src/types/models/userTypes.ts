import { Role } from "../enums";

export interface User {
  username: string;
  role: Role;
  first_name: string;
  last_name: string;
  address: string;
  is_banned: boolean;
}

export interface UserDetails {
  displayName?: string;
  email?: string;
  photo_url: string;
  phone_number?: string
  disabled: boolean;
}

export interface APIUser {
  user: User;
  details: UserDetails;
}
