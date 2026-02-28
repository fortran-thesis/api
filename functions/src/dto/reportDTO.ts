import {z} from "zod";
import {ReportReason} from "../types/enums";
import {FlexibleIdSchema, zTimestamp} from "./shared";

export const ReportCreateSchema = z.object({
  reporter_id: z.string({required_error: "Reporter ID is required."}).min(1),
  reported_user_id: z
    .string({required_error: "Reported user ID is required."})
    .min(1),
  reason: z.nativeEnum(ReportReason, {required_error: "Reason is required."}),
  details: z.string().optional(),
});

export const ReportIdSchema = z.object({
  id: FlexibleIdSchema("Report ID"),
});

export const MoldReportSchema = z.object({
  case_name: z.string({required_error: "Case name is required."}).min(1, {message: "Case name is required."}),
  date_observed: zTimestamp,
  user_id: z.string({required_error: "User ID is required."}).min(1, {message: "User ID is required."}),
  host: z.string({required_error: "Host is required."}).min(1, {message: "Host is required."}),
  description: z.string({required_error: "Description is required."}).min(1, {message: "Description is required."}),
});

export const MoldReportUpdateSchema = MoldReportSchema.partial();

export const CaseDetailSchema = z.object({
  cover_photo: z.array(z.string()).optional(),
  description: z.string({required_error: "Description is required."}).min(1, {message: "Description is required."}),
});

export const CaseDetailCreateSchema = CaseDetailSchema;

export const AssignMoldReportSchema = z.object({
  assigned_mycologist_id: z.string({required_error: "Assigned mycologist ID is required."}).min(1),
  status: z.string().optional(),
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
