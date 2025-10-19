import { z } from "zod";

export const RegisterSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .nonempty({ message: "Username is required" }),
  email: z
    .string({ required_error: "Email is required" })
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" }),
  password: z
    .string({ required_error: "Password is required" })
    .nonempty({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, {
      message: "Password must contain at least one special character",
    }),
  firstName: z
    .string({ required_error: "First name is required" })
    .nonempty({ message: "First name is required" }),
  lastName: z
    .string({ required_error: "Last name is required" })
    .nonempty({ message: "Last name is required" }),
  address: z
    .string({ required_error: "Address is required" })
    .nonempty({ message: "Address is required" }),
  phoneNumber: z
    .string()
    .optional(),
});

export const LoginSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .nonempty({ message: "Username is required" }),
  password: z
    .string({ required_error: "Password is required" })
    .nonempty({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, {
      message: "Password must contain at least one special character",
    }),
});

export const TokenSchema = z.object({
  token: z
    .string({ required_error: "ID token is required" })
    .nonempty({ message: "ID token is required" }),
});

export const UserIdSchema = z.object({
  id: z
    .string({ required_error: "UID is required " })
    .nonempty({ message: "UID is required" })
    .min(28, { message: "ID token must be exactly 28 characters" })
    .max(28, { message: "ID token must be exactly 28 characters" })
    .regex(/^[A-Za-z0-9-_]+$/, { message: "ID token format is invalid" }),
});

export const EmailSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" }),
});

export const ChangePasswordSchema = z.object({
  oldPassword: z
    .string({ required_error: "Password is required" })
    .nonempty({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, {
      message: "Password must contain at least one special character",
    }),
  newPassword: z
    .string({ required_error: "Password is required" })
    .nonempty({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, {
      message: "Password must contain at least one special character",
    }),
});

export const ChangeEmailSchema = z.object({
  oldEmail: z
    .string({ required_error: "Email is required" })
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" }),
  newEmail: z
    .string({ required_error: "Email is required" })
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" }),
});

export const UserDetailsSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" }),
  displayName: z
    .string({ required_error: "Name is required" })
    .nonempty({ message: "Name is required" }),
});

export const UserDetailsUpdateSchema = UserDetailsSchema.partial();
