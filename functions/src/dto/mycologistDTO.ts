import {z} from "zod";

export const RegisterMycologistSchema = z.object({
  first_name: z.string({required_error: "First name is required"}).min(1, "First name is required"),
  last_name: z.string({required_error: "Last name is required"}).min(1, "Last name is required"),
  username: z.string({required_error: "Username is required"}).min(3, "Username must be at least 3 characters"),
  email: z.string({required_error: "Email is required"}).email("Invalid email format"),
  password: z.string({required_error: "Password is required"}).min(6, "Password must be at least 6 characters"),
});

export type RegisterMycologistRequest = z.infer<typeof RegisterMycologistSchema>;
