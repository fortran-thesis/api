import {z} from "zod";
import {FirestoreIdSchema} from "./shared";

export const CreateFlagReportSchema = z.object({
  content_id: z.string().min(1, "Content ID is required"),
  content_type: z.string().min(1, "Content type is required"),
  reason: z.string().min(1, "Reason is required"),
  details: z.string().optional(),
});

export const UpdateFlagReportSchema = z.object({
  status: z.enum(["unresolved", "resolved"]).optional(),
  details: z.string().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {message: "At least one field must be provided for update"}
);

export const FlagReportIdSchema = z.object({
  id: FirestoreIdSchema(20, "Flag report ID"),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type CreateFlagReportRequest = z.infer<typeof CreateFlagReportSchema>;
export type UpdateFlagReportRequest = z.infer<typeof UpdateFlagReportSchema>;
export type FlagReportIdParams = z.infer<typeof FlagReportIdSchema>;
