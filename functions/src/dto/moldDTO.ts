import z from "zod";

export const MoldIdSchema = z.object({
  id: z
    .string({required_error: "UID is required "})
    .nonempty({message: "UID is required"})
    .min(20, {message: "UID must be exactly 28 characters"})
    .max(20, {message: "UID token must be exactly 28 characters"})
    .regex(/^[A-Za-z0-9-_]+$/, {message: "UID format is invalid"}),
});

export const MoldSchema = z.object({
  name: z
    .string({ required_error: "Name is required. " })
    .nonempty({ message: "Name is required " }),
  mold_details: z.object({
    info: z.object({
      description: z.string().optional(),
      taxonomy: z.object({
        kingdom: z.string(),
        phylum: z.string(),
        class: z.string(),
        order: z.string(),
        family: z.string(),
        genus: z.string(),
      }),
      additional_info: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
        })
      ).optional(),
    }),
    prevention: z.object({
      fungicide: z.array(z.string()).optional(),
      additional_info: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
        })
      ).optional(),
    }),
  }),
});

export const NameParamSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const MoldUpdateSchema = MoldSchema.partial();
