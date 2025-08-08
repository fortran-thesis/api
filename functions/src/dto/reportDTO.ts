import { z } from "zod";
import { ReportReason } from "../types/enums";

export const ReportCreateSchema = z.object({
  reporter_id: z.string({ required_error: "Reporter ID is required." }).min(1),
  reported_user_id: z
    .string({ required_error: "Reported user ID is required." })
    .min(1),
  reason: z.nativeEnum(ReportReason, { required_error: "Reason is required." }),
  details: z.string().optional(),
});

export const ReportIdSchema = z.object({
  id: z
    .string({ required_error: "ID is required" })
    .nonempty({ message: "ID is required" })
    .min(20, { message: "ID must be at least 20 characters" })
    .max(28, { message: "ID must be at most 28 characters" })
    .regex(/^[A-Za-z0-9-_]+$/, { message: "ID format is invalid" }),
});
