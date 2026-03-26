import {z} from "zod";
import {zTimestamp} from "./shared";

const ID_REGEX = /^[A-Za-z0-9_-]+$/;

// Accept both short test IDs (like "2") and production IDs (20-28 chars)
export const MoldIdSchema = z.object({
  id: z
    .string({required_error: "Mold ID is required"})
    .nonempty({message: "Mold ID is required"})
    .regex(ID_REGEX, {message: "Mold ID format is invalid"}),
});

export const MoldSchema = z.object({
  moldName: z
    .string({required_error: "Name is required. "})
    .nonempty({message: "Name is required "}),
  symptoms: z.array(z.string()).optional(),
  signs: z.array(z.string()).optional(),
  characteristics: z.array(z.string()).optional(),
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
      overview: z.string().optional(),
      health_risks: z.string().optional(),
      affected_hosts: z.string().optional(),
      symptoms_and_signs: z.string().optional(),
      disease_cycle_spread_impact: z.string().optional(),
      prevention_summary: z.string().optional(),
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
    specimen_types_csv: z.string().optional(),
    specimen_quantities_csv: z.string().optional(),
    initial_symptoms: z.array(z.string()).optional(),
    initial_symptoms_csv: z.string().optional(),
    initial_characteristics: z.array(z.string()).optional(),
    initial_characteristics_csv: z.string().optional(),
    location_gathered: z.string().optional(),
    initial_microscopic: z.string().optional(),
    initial_macroscopic: z.string().optional(),
    initial_microscopic_color: z.string().optional(),
    initial_microscopic_texture: z.string().optional(),
    initial_macroscopic_color: z.string().optional(),
    initial_macroscopic_texture: z.string().optional(),
    initial_macroscopic_symptoms: z.string().optional(),
    initial_macroscopic_characteristics: z.string().optional(),
    initial_microscopic_image_url: z.string().optional(),
    initial_macroscopic_image_url: z.string().optional(),
    date_observation: zTimestamp.optional(),
    microscopic_ai_snapshot: z.record(z.any()).optional(),
    scanned_microscopic_ids: z.array(z.string()).optional(),
    scanned_macroscopic_ids: z.array(z.string()).optional(),
  }).optional(),
  start_date: zTimestamp.optional(),
  end_date: zTimestamp.optional(),
}).refine(
  (data) => {
    // If both start_date and end_date are provided, start_date must be before end_date
    if (data.start_date && data.end_date) {
      const startMs = data.start_date.toMillis?.() || (data.start_date as any).seconds * 1000;
      const endMs = data.end_date.toMillis?.() || (data.end_date as any).seconds * 1000;
      return startMs < endMs;
    }
    // If only one or neither is provided, validation passes
    return true;
  },
  {
    message: "start_date must be before end_date",
    path: ["end_date"],
  }
);

export const FinalizeVerdictSchema = z.object({
  // Accept both formats to keep older clients working while standardizing on camelCase.
  // moldId is now optional to support verdicts for molds not in the database (predicted_class_name fallback)
  moldId: z.string().trim().min(1).optional(),
  moldName: z.string().trim().min(1).optional(),
  mold_id: z.string().trim().min(1).optional(),
  mold_name: z.string().trim().min(1).optional(),
  confidence: z.number().min(0).max(100),
  mycologist_notes: z.string().optional(),
}).refine((payload) => !!(payload.moldName || payload.mold_name), {
  message: "moldName is required",
}).transform((payload) => ({
  // moldId is nullable to allow verdicts for predicted classes not in the database
  moldId: payload.moldId ?? payload.mold_id ?? null,
  moldName: payload.moldName ?? payload.mold_name ?? "",
  confidence: payload.confidence,
  mycologist_notes: payload.mycologist_notes,
}));

export const MoldCaseCreateSchema = z.object({
  user_id: z.string().optional(),
  mycologist_id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  mold_report_id: z.string().min(1).optional(),
  photo_url: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  start_date: zTimestamp.optional(),
  end_date: zTimestamp.optional(),
}).passthrough();

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
export type FinalizeVerdictRequest = z.infer<typeof FinalizeVerdictSchema>;
export type MoldCaseCreateRequest = z.infer<typeof MoldCaseCreateSchema>;
export type SearchMoldCasesQuery = z.infer<typeof SearchMoldCasesQuerySchema>;

/**
 * Shape of cultivation_details object persisted in mold case.
 * Includes specimen info + initial observations for monitoring setup.
 */
export type CultivationDetailsPayload = z.infer<
  typeof CultivationDetailsSchema
>["cultivation_details"];
