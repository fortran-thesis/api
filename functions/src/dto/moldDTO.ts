import z from "zod";

export const MoldIdSchema = z.object({
  id: z
    .string({required_error: "UID is required "})
    .nonempty({message: "UID is required"})
    .min(20, {message: "UID must be exactly 20 characters"})
    .max(20, {message: "UID token must be exactly 20 characters"})
    .regex(/^[A-Za-z0-9-_]+$/, {message: "UID format is invalid"}),
});

export const MoldSchema = z.object({
  moldName: z
    .string({required_error: "Name is required. "})
    .nonempty({message: "Name is required "}),
  details: z.object({
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
      physicalControl: z.string().optional(),
      mechanicalControl: z.string().optional(),
      culturalControl: z.string().optional(),
      biologicalControl: z.string().optional(),
      chemicalControl: z.string().optional(),
    }),
  }),
});

export const NameParamSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const MoldUpdateSchema = MoldSchema.partial();

export const CultivationLogSchema = z.object({
  type: z.enum(["vivo", "vitro"], {required_error: "Type is required (vivo or vitro)"}),
  characteristics: z.record(z.any()).optional(),
  additional_info: z.string().optional(),
  image_url: z.string().optional(),
});

export const CultivationDetailsSchema = z.object({
  cultivation_details: z.object({
    growth_medium: z.string().optional(),
    in_vivo_details: z.record(z.any()).optional(),
    in_vitro_details: z.record(z.any()).optional(),
  }).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const SearchMoldCasesQuerySchema = z.object({
  search: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  pageToken: z.string().optional(),
});
