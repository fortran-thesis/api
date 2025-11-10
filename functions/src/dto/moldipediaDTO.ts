import {z} from "zod";

export const MoldipediaIdSchema = z.object({
  id: z
    .string({required_error: "ID is required"})
    .nonempty({message: "ID is required"})
    .min(22, {message: "ID must be at least 22 characters"})
    .max(28, {message: "ID must be at most 28 characters"})
    .regex(/^[A-Za-z0-9-_]+$/, {message: "ID format is invalid"}),
});

export const MoldipediaCreateSchema = z.object({
  title: z
    .string({required_error: "Title is required."})
    .min(1, {message: "Title cannot be empty."}),
  body: z
    .string({required_error: "Body is required."})
    .min(1, {message: "Body cannot be empty."}),
  author_id: z
    .string({required_error: "Author ID is required."})
    .min(1, {message: "Author ID cannot be empty."}),
  // cover_photo is handled by multer, not required from client
});

export const MoldipediaUpdateSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  // author_id and cover_photo are not updatable via patch
});
