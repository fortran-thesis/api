import {z} from "zod";

export const FAQIdSchema = z.object({
  id: z
    .string({required_error: "ID is required"})
    .nonempty({message: "ID is required"})
    .min(22, {message: "ID must be at least 22 characters"})
    .max(28, {message: "ID must be at most 28 characters"})
    .regex(/^[A-Za-z0-9-_]+$/, {message: "ID format is invalid"}),
});

export const FAQCreateSchema = z.object({
  question: z
    .string({required_error: "Question is required."})
    .min(1, {message: "Question cannot be empty."}),
  answer: z
    .string({required_error: "Answer is required."})
    .min(1, {message: "Answer cannot be empty."}),
});

export const FAQUpdateSchema = z.object({
  question: z.string().optional(),
  answer: z.string().optional(),
});
