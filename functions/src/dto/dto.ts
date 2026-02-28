import {z} from "zod";
import {FirebaseAuthIdSchema} from "./shared";

export const PasswordSchema = z
  .string({required_error: "Password is required"})
  .nonempty({message: "Password is required"})
  .min(8, {message: "Password must be at least 8 characters long"})
  .regex(/[a-z]/, {message: "Password must contain at least one lowercase letter"})
  .regex(/[A-Z]/, {message: "Password must contain at least one uppercase letter"})
  .regex(/[0-9]/, {message: "Password must contain at least one number"})
  .regex(/[^A-Za-z0-9]/, {message: "Password must contain at least one special character"});

export const RegisterSchema = z.object({
  username: z
    .string({required_error: "Username is required"})
    .nonempty({message: "Username is required"}),
  email: z
    .string({required_error: "Email is required"})
    .nonempty({message: "Email is required"})
    .email({message: "Invalid email address"}),
  password: PasswordSchema,
  firstName: z
    .string({required_error: "First name is required"})
    .nonempty({message: "First name is required"}),
  lastName: z
    .string({required_error: "Last name is required"})
    .nonempty({message: "Last name is required"}),
  address: z
    .string({required_error: "Address is required"})
    .nonempty({message: "Address is required"}),
  phoneNumber: z
    .string()
    .optional(),
});

export const LoginSchema = z.object({
  username: z
    .string({required_error: "Username is required"})
    .nonempty({message: "Username is required"}),
  password: PasswordSchema,
});

export const TokenSchema = z.object({
  token: z
    .string({required_error: "ID token is required"})
    .nonempty({message: "ID token is required"}),
});

export const UserIdSchema = z.object({
  id: FirebaseAuthIdSchema("User ID"),
});

export const EmailSchema = z.object({
  email: z
    .string({required_error: "Email is required"})
    .nonempty({message: "Email is required"})
    .email({message: "Invalid email address"}),
});

export const ChangePasswordSchema = z.object({
  oldPassword: z
    .string({required_error: "Password is required"})
    .nonempty({message: "Password is required"}),
  newPassword: PasswordSchema,
});

export const ChangeEmailSchema = z.object({
  oldEmail: z
    .string({required_error: "Email is required"})
    .nonempty({message: "Email is required"})
    .email({message: "Invalid email address"}),
  newEmail: z
    .string({required_error: "Email is required"})
    .nonempty({message: "Email is required"})
    .email({message: "Invalid email address"}),
});

export const UserDetailsSchema = z.object({
  email: z
    .string({required_error: "Email is required"})
    .nonempty({message: "Email is required"})
    .email({message: "Invalid email address"}),
  displayName: z
    .string({required_error: "Name is required"})
    .nonempty({message: "Name is required"}),
});

export const UserDetailsUpdateSchema = UserDetailsSchema.partial();

export const UserProfileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  photo_url: z.string().optional(),
}).partial();

export const SearchUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  pageToken: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type TokenRequest = z.infer<typeof TokenSchema>;
export type UserIdParams = z.infer<typeof UserIdSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type ChangeEmailRequest = z.infer<typeof ChangeEmailSchema>;
export type UserDetailsRequest = z.infer<typeof UserDetailsSchema>;
export type UserDetailsUpdateRequest = z.infer<typeof UserDetailsUpdateSchema>;
export type UserProfileUpdateRequest = z.infer<typeof UserProfileUpdateSchema>;
export type SearchUsersQuery = z.infer<typeof SearchUsersQuerySchema>;
