import {z} from "zod";
import {ReportReason} from "../types/enums";

export const ReportCreateSchema = z.object({
  reporter_id: z.string({required_error: "Reporter ID is required."}).min(1),
  reported_user_id: z
    .string({required_error: "Reported user ID is required."})
    .min(1),
  reason: z.nativeEnum(ReportReason, {required_error: "Reason is required."}),
  details: z.string().optional(),
});

export const ReportIdSchema = z.object({
  id: z
    .string({required_error: "ID is required"})
    .nonempty({message: "ID is required"})
    .min(20, {message: "ID must be at least 20 characters"})
    .max(28, {message: "ID must be at most 28 characters"})
    .regex(/^[A-Za-z0-9-_]+$/, {message: "ID format is invalid"}),
});

export const MoldReportSchema = z.object({
  user_id: z.string({required_error: "User ID is required."}).min(1, {message: "User ID is required."}),
  host: z.string({required_error: "Host is required."}).min(1, {message: "Host is required."}),
  location: z.string({required_error: "Location is required."}).min(1, {message: "Location is required."}),
  case_details: z.array(
    z.object({
      cover_photo: z.array(z.string()).optional(),
      description: z.string({required_error: "Description is required."}).min(1, {message: "Description is required."}),
    })
  ).min(1, {message: "At least one case detail is required."}),
  description: z.string().optional(),
  assigned_mycologist_id: z.string().nullable().optional(),
  status: z.string().optional(),
  is_archived: z.boolean().optional(),
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
