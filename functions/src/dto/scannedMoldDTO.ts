import {z} from "zod";
import {FlexibleIdSchema} from "./shared";

export const ScannedMoldCreateSchema = z.object({
  user_id: z.string().min(1).optional(),
  image_format: z.string({required_error: "Image format is required."}).min(1),
  scan_modality: z.enum(["microscopic", "macroscopic"], {
    required_error: "Scan modality is required.",
  }),
  source_flow: z.enum(["identification", "monitoring_initial", "cultivation_log"], {
    required_error: "Source flow is required.",
  }),
  source_tab: z.enum(["in-vivo", "in-vitro"]).optional(),
  mold_id: z.string().min(1).optional(),
  predicted_class_name: z.string().min(1).optional(),
  corrected_genus: z.string().min(1).optional(),
  corrected_predicted_class_name: z.string().min(1).nullable().optional(),
  corrected_by_user_id: z.string().min(1).optional(),
  corrected_at: z
    .string()
    .datetime({message: "corrected_at must be an ISO datetime string."})
    .optional(),
  mold_case_id: z.string().min(1).optional(),
  captured_at: z
    .string()
    .datetime({message: "captured_at must be an ISO datetime string."})
    .optional(),
  // image_url and uploaded_at are set in controller/service, not required from client
  scanned_results: z.object({
    confidence_score: z.number({required_error: "Confidence score is required."}),
    flagged: z.boolean({required_error: "Flagged is required."}),
  }),
});

export const ScannedMoldUpdateSchema = z.object({
  image_format: z.string().optional(),
  scan_modality: z.enum(["microscopic", "macroscopic"]).optional(),
  source_flow: z.enum(["identification", "monitoring_initial", "cultivation_log"]).optional(),
  source_tab: z.enum(["in-vivo", "in-vitro"]).optional(),
  mold_id: z.string().nullable().optional(),
  predicted_class_name: z.string().optional(),
  corrected_genus: z.string().min(1).optional(),
  corrected_predicted_class_name: z.string().min(1).nullable().optional(),
  corrected_by_user_id: z.string().min(1).optional(),
  corrected_at: z
    .string()
    .datetime({message: "corrected_at must be an ISO datetime string."})
    .optional(),
  mold_case_id: z.string().optional(),
  captured_at: z
    .string()
    .datetime({message: "captured_at must be an ISO datetime string."})
    .optional(),
  scanned_results: z.object({
    confidence_score: z.number().optional(),
    flagged: z.boolean().optional(),
  }).optional(),
});

export const ScannedMoldIdSchema = z.object({
  id: FlexibleIdSchema("Scanned mold ID"),
});

export const ScannedMoldQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  pageToken: z.string().optional(),
  mold_case_id: z.string().optional(),
  scan_modality: z.enum(["microscopic", "macroscopic"]).optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type ScannedMoldCreateRequest = z.infer<typeof ScannedMoldCreateSchema>;
export type ScannedMoldUpdateRequest = z.infer<typeof ScannedMoldUpdateSchema>;
export type ScannedMoldIdParams = z.infer<typeof ScannedMoldIdSchema>;
export type ScannedMoldQuery = z.infer<typeof ScannedMoldQuerySchema>;
