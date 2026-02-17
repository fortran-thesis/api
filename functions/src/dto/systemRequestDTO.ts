import {z} from "zod";

export const SystemRequestCreateSchema = z.object({
  type: z.enum(["feedback", "bug"]),
  message: z.string().min(1, "Message is required"),
  user_id: z.string().optional(),
});

export const SystemRequestIdSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const SystemRequestUpdateSchema = z.object({
  message: z.string().min(1).optional(),
  type: z.enum(["feedback", "bug"]).optional(),
  user_id: z.string().optional(),
});
