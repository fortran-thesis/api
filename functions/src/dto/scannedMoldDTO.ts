import {z} from "zod";

export const ScannedMoldCreateSchema = z.object({
  user_id: z.string({required_error: "User ID is required."}).min(1),
  image_format: z.string({required_error: "Image format is required."}).min(1),
  // image_url and uploaded_at are set in controller/service, not required from client
  scanned_results: z.object({
    confidence_score: z.number({required_error: "Confidence score is required."}),
    flagged: z.boolean({required_error: "Flagged is required."}),
  }),
});

export const ScannedMoldUpdateSchema = z.object({
  image_format: z.string().optional(),
  scanned_results: z.object({
    confidence_score: z.number().optional(),
    flagged: z.boolean().optional(),
  }).optional(),
});

export const ScannedMoldIdSchema = z.object({
  id: z
    .string({required_error: "ID is required"})
    .nonempty({message: "ID is required"})
    .min(20, {message: "ID must be at least 20 characters"})
    .max(28, {message: "ID must be at most 28 characters"})
    .regex(/^[A-Za-z0-9-_]+$/, {message: "ID format is invalid"}),
});
