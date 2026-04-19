import {Role} from "../enums";

export interface GeoLocation {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  source?: string;
}

export interface User {
  username: string;
  role: Role;
  first_name: string;
  last_name: string;
  address: string;
  geo_location?: GeoLocation;
  is_banned: boolean;
  occupation?: string;
}

export interface UserDetails {
  displayName?: string;
  email?: string;
  photo_url: string;
  phone_number?: string
  disabled: boolean;
  address?: string;
}

export interface APIUser {
  id: string;
  user: User;
  details: UserDetails;
}
