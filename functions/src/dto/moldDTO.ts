import {z} from "zod";
import {FirestoreIdSchema, zTimestamp} from "./shared";

export const MoldIdSchema = z.object({
  id: FirestoreIdSchema(20, "Mold ID"),
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
      predicted_class_id: z.number().optional(),
      predicted_class_name: z.string().optional(),
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
    // ── Specimen & Evidence Fields ────────────────────────────────────────
    // Reserved for monitoring setup data captured by mobile client.
    // These fields are persisted but not currently merged into MoldReport.reported_*
    // fields. Future versions may wire these into lookup logic.
    specimen_types: z.array(z.string()).optional(),
    specimen_quantities: z.array(z.string()).optional(),
    initial_symptoms: z.array(z.string()).optional(),
    initial_characteristics: z.array(z.string()).optional(),
    location_gathered: z.string().optional(),
  }).optional(),
  start_date: zTimestamp.optional(),
  end_date: zTimestamp.optional(),
});

export const SearchMoldCasesQuerySchema = z.object({
  search: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  pageToken: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type MoldIdParams = z.infer<typeof MoldIdSchema>;
export type MoldRequest = z.infer<typeof MoldSchema>;
export type MoldUpdateRequest = z.infer<typeof MoldUpdateSchema>;
export type CultivationLogRequest = z.infer<typeof CultivationLogSchema>;
export type CultivationDetailsRequest = z.infer<typeof CultivationDetailsSchema>;
export type SearchMoldCasesQuery = z.infer<typeof SearchMoldCasesQuerySchema>;

/**
 * Shape of cultivation_details object persisted in mold case.
 * Includes specimen info + initial observations for monitoring setup.
 */
export type CultivationDetailsPayload = z.infer<
  typeof CultivationDetailsSchema
>["cultivation_details"];
