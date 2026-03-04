import {z} from "zod";

// ---------------------------------------------------------------------------
// Per-field enum schemas
// Generated from all training CSVs (alternaria, aspergilus_flavi,
// aspergilus_nigri, fusarium, penicillium, rhizopus).
// Values are the canonical clean forms used at both train-time and
// inference-time.
// ---------------------------------------------------------------------------

export const HyphaePresenceSchema = z.enum([
  "Cannot Assess Clearly",
  "No",
  "Yes",
]);

export const HyphaeSeptationSchema = z.enum([
  "Aseptate",
  "Aseptate/Coenocytic",
  "Cannot Assess Clearly",
  "No",
  "Septate",
]);

export const VesiclePresenceSchema = z.enum([
  "Cannot Assess Clearly",
  "No",
  "Yes",
]);

export const SporangiumPresenceSchema = z.enum([
  "Cannot Assess Clearly",
  "No",
  "Yes",
]);

export const HyphaePigmentationSchema = z.enum([
  "Brown/Dark",
  "Cannot Assess Clearly",
  "Dark Brown",
  "Dark Brown/Black",
  "Dark Brown/Green",
  "Dematiaceous",
  "Green",
  "Green/Brown",
  "Green/Yellow",
  "Hyaline",
  "Hyaline to Brown",
  "Hyaline to Dark Brown",
  "Hyaline to Light Brown",
  "Hyaline to Pale Blue/Brown",
  "Hyaline to Pale Brown",
  "Hyaline to Pale Green",
  "Hyaline to Pale Yellow/Brown",
  "Pale Brown/Green",
  "Pale Green/Blue",
  "Pale Green/Brown",
  "Pale Yellow/Green",
]);

export const RhizoidPresenceSchema = z.enum([
  "Cannot Assess",
  "Cannot Assess Clearly",
  "No",
  "Yes",
]);

export const SporeShapeSchema = z.enum([
  "Cannot Assess Clearly",
  "Canoe/Sickle-shaped",
  "Canoe/Sickle-shaped and Ovoid/Elliptical",
  "Fusiform/Segmented",
  "Fusiform/Sickle-shaped",
  "Globose",
  "Globose to Barrel-shaped",
  "Globose to Ovoid",
  "Globose to Ovoid/Elliptical",
  "Globose to Subglobose",
  "Muriform/Club-shaped",
  "Muriform/Obclavate",
  "Oval with Septa",
  "Oval/Elongated with Septa",
  "Oval/Muriform",
  "Oval/Muriform/Segmented",
  "Oval/Segmented",
  "Oval/Spherical with Septa",
  "Ovoid to Barrel-shaped",
  "Ovoid/Elliptical",
  "Sickle/Banana-shaped",
  "Spherical",
  "Spherical to Oval",
  "Spherical/Oval",
  "Spherical/Round",
]);

export const ConidiophoreBranchingSchema = z.enum([
  "Absent",
  "Biverticillate/Branched",
  "Branched",
  "Cannot Assess Clearly",
  "Simple",
  "Simple to Slightly Branched",
  "Simple/Branched",
  "Simple/Variable",
  "Unbranched",
]);

export const PhialideArrangementSchema = z.enum([
  "Absent",
  "Biseriate",
  "Brush-like",
  "Cannot Assess Clearly",
  "Metulae and Phialides",
  "Phialides in Clusters",
  "Phialides on Conidiophores",
  "Present",
  "Radial",
  "Terminal",
]);

export const SporeArrangementSchema = z.enum([
  "Absent",
  "Cannot Assess Clearly",
  "Chained/Segmented",
  "Chains",
  "Chains and Clusters",
  "Chains/Branched",
  "Chains/Clustered",
  "Chains/Clusters",
  "Chains/Scattered",
  "Clustered",
  "Clustered Head",
  "Clustered Head / Radiate",
  "Clustered/Attached",
  "Clustered/Fragmented",
  "Clustered/Loose",
  "Clustered/Massed",
  "Clustered/Scattered",
  "Clusters",
  "Clusters/Short Chains",
  "Columnar/Radiate",
  "Fragmented/Chains",
  "In Sporangium",
  "Long Chains",
  "Massed",
  "Radial Columns",
  "Radiate",
  "Radiate/Chains from Vesicle",
  "Radiate/Clustered",
  "Radiate/Columnar",
  "Radiate/Dispersed",
  "Radiate/Loose",
  "Radiate/Scattered",
  "Scattered/Clustered",
  "Scattered/Dispersed",
  "Scattered/Free Conidia",
  "Scattered/Free Conidia and Clustered/Sclerotium",
  "Scattered/Loose",
  "Scattered/Massed",
  "Short Chains/Clusters",
  "Single/Scattered",
  "Single/Short Chains",
  "Within Sporangium",
]);

export const SporeColorSchema = z.enum([
  "Blue",
  "Blue-Green",
  "Blue-green/Green",
  "Blue/Green",
  "Blue/Yellow",
  "Brown/Black",
  "Brown/Dark",
  "Brown/Dark Brown",
  "Cannot Assess Clearly",
  "Dark Blue",
  "Dark Blue/Brown",
  "Dark Brown to Black",
  "Dark Brown/Black",
  "Dark Brown/Green",
  "Dark Green/Blue",
  "Dark Green/Brown",
  "Green",
  "Green/Blue",
  "Green/Brown",
  "Green/Dark",
  "Green/Yellow",
  "Greenish-Blue",
  "Greenish-Brown",
  "Hyaline",
  "Hyaline to Light Brown",
  "Hyaline to Pale",
  "Hyaline to Pale Green",
  "Hyaline/Light Brown",
  "Yellow/Brown",
]);

export const SporangiophorePresenceSchema = z.enum([
  "Absent",
  "Cannot Assess Clearly",
  "No",
  "Yes",
]);

export const HyphaeBranchingSchema = z.enum([
  "Acute-angle",
  "Acute-angle/Variable",
  "Cannot Assess Clearly",
  "Irregular",
  "No",
  "Right-angle/Irregular",
  "Yes",
]);

export const HyphaeWidthSchema = z.enum([
  "Broad",
  "Cannot Assess Clearly",
  "Medium",
  "Medium to Wide",
  "Narrow",
  "Narrow to Medium",
  "Narrow-Medium",
  "Thin",
  "Thin to Medium",
  "Wide",
  "Wide/Broad",
]);

export const ColumellaPresenceSchema = z.enum([
  "Cannot Assess",
  "Cannot Assess Clearly",
  "No",
  "Possibly Present",
  "Yes",
]);

export const SporeTypeSchema = z.enum([
  "Arthroconidia/Chlamydospores",
  "Cannot Assess Clearly",
  "Chlamydospores/Sexual Spores",
  "Conidia",
  "Conidia and Other",
  "Conidia and Sclerotium",
  "Conidia/Hyphal Fragments",
  "Hyphal Fragments",
  "Hyphal Fragments/Arthroconidia",
  "Macroconidia",
  "Macroconidia and Microconidia",
  "Muriform/Segmented Conidia",
  "Other",
  "Sporangiospores",
]);

export const ConidiophoreLengthSchema = z.enum([
  "Absent",
  "Cannot Assess Clearly",
  "Long",
  "Medium",
  "Medium to Long",
  "Medium-Long",
  "Short",
  "Short-Medium",
]);

export const ConidiophoreSurfaceSchema = z.enum([
  "Cannot Assess Clearly",
  "Rough",
  "Rough/Coiled",
  "Rough/Spiny",
  "Smooth",
  "Smooth to Rough",
]);

export const VesicleShapeSchema = z.enum([
  "Absent",
  "Cannot Assess Clearly",
  "Clavate to Globose",
  "Globose",
  "Globose to Subglobose",
  "Globose/Elongated",
  "Globose/Ovoid",
  "Spherical/Hemispherical",
]);

export const ConidiophorePresenceSchema = z.enum([
  "Cannot Assess Clearly",
  "Likely Yes",
  "No",
  "Present",
  "Yes",
]);

export const SporeSurfaceSchema = z.enum([
  "Cannot Assess Clearly",
  "Rough",
  "Rough/Thick-walled",
  "Rough/Verrucose",
  "Rough/Warty",
  "Smooth",
  "Smooth to Rough",
  "Smooth to Slightly Rough",
  "Smooth/Thick-walled",
]);

export const SterigmataArrangementSchema = z.enum([
  "Absent",
  "Cannot Assess Clearly",
  "Phialides in Clusters/Simple",
  "Radiate/Covering entire vesicle",
  "Radiate/Covering upper 3/4 of vesicle",
  "Verticillate/Penicillate",
]);

// ---------------------------------------------------------------------------
// Combined characteristics schema — all fields optional at inference time
// ---------------------------------------------------------------------------

export const MorphologyCharacteristicsSchema = z.object({
  Hyphae_Presence: HyphaePresenceSchema.optional(),
  Hyphae_Septation: HyphaeSeptationSchema.optional(),
  Vesicle_Presence: VesiclePresenceSchema.optional(),
  Sporangium_Presence: SporangiumPresenceSchema.optional(),
  Hyphae_Pigmentation: HyphaePigmentationSchema.optional(),
  Rhizoid_Presence: RhizoidPresenceSchema.optional(),
  Spore_Shape: SporeShapeSchema.optional(),
  Conidiophore_Branching: ConidiophoreBranchingSchema.optional(),
  Phialide_Arrangement: PhialideArrangementSchema.optional(),
  Spore_Arrangement: SporeArrangementSchema.optional(),
  Spore_Color: SporeColorSchema.optional(),
  Sporangiophore_Presence: SporangiophorePresenceSchema.optional(),
  Hyphae_Branching: HyphaeBranchingSchema.optional(),
  Hyphae_Width: HyphaeWidthSchema.optional(),
  Columella_Presence: ColumellaPresenceSchema.optional(),
  Spore_Type: SporeTypeSchema.optional(),
  Conidiophore_Length: ConidiophoreLengthSchema.optional(),
  Conidiophore_Surface: ConidiophoreSurfaceSchema.optional(),
  Vesicle_Shape: VesicleShapeSchema.optional(),
  Conidiophore_Presence: ConidiophorePresenceSchema.optional(),
  Spore_Surface: SporeSurfaceSchema.optional(),
  Sterigmata_Arrangement: SterigmataArrangementSchema.optional(),
});

// ---------------------------------------------------------------------------
// Prediction request schemas
// ---------------------------------------------------------------------------

export const JsonPredictRequestSchema = z.object({
  image_b64: z.string({required_error: "image_b64 is required"}),
  characteristics: MorphologyCharacteristicsSchema.optional(),
});

export const MultipartPredictFieldsSchema = MorphologyCharacteristicsSchema;

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type MorphologyCharacteristics = z.infer<typeof MorphologyCharacteristicsSchema>;
export type JsonPredictRequest = z.infer<typeof JsonPredictRequestSchema>;
export type MultipartPredictFields = z.infer<typeof MultipartPredictFieldsSchema>;

// ---------------------------------------------------------------------------
// Valid species labels (kept co-located with the characteristics for reference)
// ---------------------------------------------------------------------------

export const FUNGAL_SPECIES = [
  "Alternaria_spp",
  "Aspergillus_section_Flavi",
  "Aspergillus_section_Nigri",
  "Fusarium_spp",
  "Penicillium_spp",
  "Rhizopus_spp",
] as const;

export type FungalSpecies = (typeof FUNGAL_SPECIES)[number];
