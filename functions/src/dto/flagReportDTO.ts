import {z} from "zod";

export const CreateFlagReportSchema = z.object({
  content_id: z.string().min(1, "Content ID is required"),
  content_type: z.string().min(1, "Content type is required"),
  reason: z.string().min(1, "Reason is required"),
  details: z.string().optional(),
});

export const FlagReportIdSchema = z.object({
  id: z.string().min(1, "Flag report ID is required"),
});
