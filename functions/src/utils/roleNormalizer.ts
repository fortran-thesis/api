import {Role} from "../types/enums";

/**
 * Maps legacy Firestore role strings to current Role enum values.
 * "administrator" → Role.ADMIN, "curator" → Role.CURATOR, "user" → Role.USER
 */
export const normalizeRole = (role: string): Role => {
  const LEGACY_ROLE_MAP: Record<string, Role> = {
    administrator: Role.ADMIN,
    curator: Role.CURATOR,
    user: Role.USER,
  };
  return LEGACY_ROLE_MAP[role] ?? (role as Role);
};
