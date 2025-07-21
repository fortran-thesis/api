import { z } from "zod";

export const RegisterSchema = z.object({
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
});

export const LoginSchema = z.object({
  token: z
    .string({ required_error: "ID token is required" })
    .nonempty({ message: "ID token is required" })
    .min(28, { message: "ID token must be exactly 28 characters" })
    .max(28, { message: "ID token must be exactly 28 characters" })
    .regex(/^[A-Za-z0-9-_]+$/, { message: "ID token format is invalid" }),
});
export const UserDetailsSchema = z.object({});
