import z from "zod";

export const MoldIdSchema = z.object({
  id: z
    .string({ required_error: "UID is required " })
    .nonempty({ message: "UID is required" })
    .min(20, { message: "UID must be exactly 28 characters" })
    .max(20, { message: "UID token must be exactly 28 characters" })
    .regex(/^[A-Za-z0-9-_]+$/, { message: "UID format is invalid" }),
});

export const MoldSchema = z.object({
  name: z
    .string({ required_error: "Name is required. " })
    .nonempty({ message: "Name is required " }),
  description: z
    .string({ required_error: "Description is required. " })
    .nonempty({ message: "Description is required " }),
  growth_stage: z
    .string({ required_error: "Growth stage is required. " })
    .nonempty({ message: "Growth stage is required " }),
});

export const NameParamSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const MoldUpdateSchema = MoldSchema.partial();
