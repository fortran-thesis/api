import {z} from "zod";
import {FirestoreIdSchema} from "./shared";

export const MoldipediaIdSchema = z.object({
  id: FirestoreIdSchema(20, "Moldipedia ID"),
});

const MoldipediaTreatmentsSchema = z.object({
  mechanical: z.string().optional(),
  cultural: z.string().optional(),
  biological: z.string().optional(),
  physical: z.string().optional(),
  chemical: z.string().optional(),
}).optional();

const MoldipediaFindingSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const MoldipediaCreateSchema = z.object({
  title: z
    .string({required_error: "Title is required."})
    .min(1, {message: "Title cannot be empty."}),
  body: z
    .string({required_error: "Body is required."})
    .min(1, {message: "Body cannot be empty."}),
  author_id: z
    .string({required_error: "Author ID is required."})
    .min(1, {message: "Author ID cannot be empty."}),
  mold_type: z.string().optional(),
  affected_hosts: z.string().optional(),
  symptoms: z.string().optional(),
  disease_cycle: z.string().optional(),
  impact: z.string().optional(),
  prevention: z.string().optional(),
  treatments: MoldipediaTreatmentsSchema,
  findings: z.array(MoldipediaFindingSchema).optional(),
  tags: z.array(z.string()).optional(),
  // cover_photo is handled by multer, not required from client
});

export const MoldipediaUpdateSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  mold_type: z.string().optional(),
  affected_hosts: z.string().optional(),
  symptoms: z.string().optional(),
  disease_cycle: z.string().optional(),
  impact: z.string().optional(),
  prevention: z.string().optional(),
  treatments: MoldipediaTreatmentsSchema,
  findings: z.array(MoldipediaFindingSchema).optional(),
  tags: z.array(z.string()).optional(),
  // author_id and cover_photo are not updatable via patch
});

export const SearchMoldipediaQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  pageToken: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────
export type MoldipediaIdParams = z.infer<typeof MoldipediaIdSchema>;
export type MoldipediaCreateRequest = z.infer<typeof MoldipediaCreateSchema>;
export type MoldipediaUpdateRequest = z.infer<typeof MoldipediaUpdateSchema>;
export type SearchMoldipediaQuery = z.infer<typeof SearchMoldipediaQuerySchema>;
