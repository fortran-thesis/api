import {z} from "zod";
import {FirestoreIdSchema} from "./shared";

export const SystemRequestCreateSchema = z.object({
  type: z.enum(["feedback", "bug"]),
  message: z.string().min(1, "Message is required"),
  user_id: z.string().optional(),
});

export const SystemRequestIdSchema = z.object({
  id: FirestoreIdSchema(20, "System request ID"),
});

export const SystemRequestUpdateSchema = z.object({
  message: z.string().min(1).optional(),
  type: z.enum(["feedback", "bug"]).optional(),
  user_id: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type SystemRequestCreateRequest = z.infer<typeof SystemRequestCreateSchema>;
export type SystemRequestIdParams = z.infer<typeof SystemRequestIdSchema>;
export type SystemRequestUpdateRequest = z.infer<typeof SystemRequestUpdateSchema>;
