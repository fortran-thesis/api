import {z} from "zod";
import {FirestoreIdSchema} from "./shared";

export const FAQIdSchema = z.object({
  id: FirestoreIdSchema(20, "FAQ ID"),
});

export const FAQCreateSchema = z.object({
  question: z
    .string({required_error: "Question is required."})
    .min(1, {message: "Question cannot be empty."}),
  answer: z
    .string({required_error: "Answer is required."})
    .min(1, {message: "Answer cannot be empty."}),
  user_id: z
    .string({required_error: "User ID is required."})
    .min(1, {message: "User ID cannot be empty."}),
});

export const FAQUpdateSchema = z.object({
  question: z.string().optional(),
  answer: z.string().optional(),
  user_id: z.string().optional(),
});

export const SearchFAQQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  pageToken: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type FAQIdParams = z.infer<typeof FAQIdSchema>;
export type FAQCreateRequest = z.infer<typeof FAQCreateSchema>;
export type FAQUpdateRequest = z.infer<typeof FAQUpdateSchema>;
export type SearchFAQQuery = z.infer<typeof SearchFAQQuerySchema>;
