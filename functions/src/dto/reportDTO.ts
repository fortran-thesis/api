import {z} from "zod";
import {ReportReason} from "../types/enums";
import {zTimestamp} from "./shared";

const ID_REGEX = /^[A-Za-z0-9_-]+$/;

export const ReportCreateSchema = z.object({
  reporter_id: z.string({required_error: "Reporter ID is required."}).min(1),
  reported_user_id: z
    .string({required_error: "Reported user ID is required."})
    .min(1),
  reason: z.nativeEnum(ReportReason, {required_error: "Reason is required."}),
  details: z.string().optional(),
});

// Accept both short test IDs (like "2") and production IDs (20-28 chars)
export const ReportIdSchema = z.object({
  id: z
    .string({required_error: "Report ID is required"})
    .nonempty({message: "Report ID is required"})
    .regex(ID_REGEX, {message: "Report ID format is invalid"}),
});

export const MoldReportSchema = z.object({
  case_name: z.string({required_error: "Case name is required."}).min(1, {message: "Case name is required."}),
  date_observed: zTimestamp,
  user_id: z.string().optional(), // ✅ Optional - set from authenticated user in controller
  priority: z.enum(["low", "medium", "high"]).optional(),
  host: z.string({required_error: "Host is required."}).min(1, {message: "Host is required."}),
  location: z.string({required_error: "Location is required."}).min(1, {message: "Location is required."}),
  description: z.string({required_error: "Description is required."}).min(1, {message: "Description is required."}),
  reported_symptoms: z.array(z.string()).optional(),
  reported_signs: z.array(z.string()).optional(),
  reported_characteristics: z.array(z.string()).optional(),
});

export const MoldReportUpdateSchema = MoldReportSchema.partial().extend({
  status: z.enum(["pending", "in progress", "in_progress", "resolved", "rejected", "closed"]).optional(),
});

export const CaseDetailSchema = z.object({
  cover_photo: z.array(z.string()).optional(),
  description: z.string({required_error: "Description is required."}).min(1, {message: "Description is required."}),
});

export const CaseDetailCreateSchema = CaseDetailSchema;

export const AssignMoldReportSchema = z.object({
  assigned_mycologist_id: z.string({required_error: "Assigned mycologist ID is required."}).min(1),
  status: z.enum(["in progress", "in_progress"]).optional(),
});

export const SearchMoldReportsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["pending", "in progress", "resolved", "rejected"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  pageToken: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type ReportCreateRequest = z.infer<typeof ReportCreateSchema>;
export type ReportIdParams = z.infer<typeof ReportIdSchema>;
export type MoldReportRequest = z.infer<typeof MoldReportSchema>;
export type MoldReportUpdateRequest = z.infer<typeof MoldReportUpdateSchema>;
export type CaseDetailRequest = z.infer<typeof CaseDetailSchema>;
export type AssignMoldReportRequest = z.infer<typeof AssignMoldReportSchema>;
export type SearchMoldReportsQuery = z.infer<typeof SearchMoldReportsQuerySchema>;
