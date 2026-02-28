import {z} from "zod";
import {FlexibleIdSchema} from "./shared";

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
  id: FlexibleIdSchema("Scanned mold ID"),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type ScannedMoldCreateRequest = z.infer<typeof ScannedMoldCreateSchema>;
export type ScannedMoldUpdateRequest = z.infer<typeof ScannedMoldUpdateSchema>;
export type ScannedMoldIdParams = z.infer<typeof ScannedMoldIdSchema>;
