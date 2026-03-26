import {z} from "zod";
import {ReportReason} from "../types/enums";
import {zTimestamp, zTimestampOptional} from "./shared";

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
  status: z.enum(["pending", "in progress", "resolved", "rejected"]).optional(),
});

export const CaseDetailSchema = z.object({
  cover_photo: z.array(z.string()).optional(),
  description: z.string({required_error: "Description is required."}).min(1, {message: "Description is required."}),
});

export const CaseDetailCreateSchema = CaseDetailSchema;

export const AssignMoldReportSchema = z.object({
  assigned_mycologist_id: z.string({required_error: "Assigned mycologist ID is required."}).min(1),
  status: z.enum(["in progress"]).optional(),
  end_date: zTimestampOptional,
}).refine(
  (data) => {
    if (!data.end_date) {
      return true; // No validation if end_date is not provided
    }

    const endDateMs = data.end_date.toMillis?.() || (data.end_date as any).seconds * 1000;
    const endDate = new Date(endDateMs);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Must be at least 3 working days from today
    const MIN_WORKING_DAYS = 3;
    let workingDaysFromNow = 0;
    let checkDate = new Date(today);

    while (workingDaysFromNow < MIN_WORKING_DAYS) {
      checkDate.setDate(checkDate.getDate() + 1);
      const dayOfWeek = checkDate.getDay();
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysFromNow++;
      }
    }

    // End date must be on or after the minimum working date
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    return endDateOnly >= checkDate;
  },
  {
    message: "end_date must be at least 3 working days from today and cannot fall on a weekend",
    path: ["end_date"],
  }
).refine(
  (data) => {
    if (!data.end_date) {
      return true;
    }

    const endDateMs = data.end_date.toMillis?.() || (data.end_date as any).seconds * 1000;
    const endDate = new Date(endDateMs);
    const dayOfWeek = endDate.getDay();

    // Must not fall on a weekend
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  },
  {
    message: "end_date cannot fall on a weekend (Saturday or Sunday)",
    path: ["end_date"],
  }
);

export const RejectMoldReportSchema = z.object({
  rejection_reason: z.string().trim().min(1, {message: "Rejection reason is required."}),
});

export const SearchMoldReportsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["pending", "in progress", "resolved", "rejected"]).optional(),
  scope: z.enum(["own", "assigned", "all"]).optional(),
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
export type RejectMoldReportRequest = z.infer<typeof RejectMoldReportSchema>;
export type SearchMoldReportsQuery = z.infer<typeof SearchMoldReportsQuerySchema>;
