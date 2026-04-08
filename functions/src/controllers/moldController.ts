import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {
  addMoldToFirestore,
  removeMold,
  retrieveAllMolds,
  retrieveMoldById,
  retrieveMoldByName,
  retrieveMoldByPredictedClassName,
  retrieveMoldByPredictedClassId,
  softRemoveMold,
  updateMoldInFirestore,
} from "../services/moldService";
import {Mold, MoldDetails, PaginatedResult, WithId} from "../types/types";
import {MoldStatus} from "../types/models/moldTypes";

export const ENRICHED_MOLD_INFO_FIELDS = [
  {key: "overview", title: "Overview"},
  {key: "health_risks", title: "Health Risks"},
  {key: "affected_hosts", title: "Affected Hosts"},
  {key: "symptoms_and_signs", title: "Symptoms and Signs"},
  {key: "disease_cycle_spread_impact", title: "Disease Cycle / Spread / Impact"},
  {key: "prevention_summary", title: "Prevention Summary"},
] as const;

export const LEGACY_INFO_ALIASES: Record<string, string[]> = {
  overview: ["overview"],
  health_risks: ["health risks", "health risk", "risk"],
  affected_hosts: ["affected hosts", "affected crops", "hosts", "host"],
  symptoms_and_signs: ["symptoms and signs", "symptoms & signs", "symptoms signs", "symptoms", "signs"],
  disease_cycle_spread_impact: [
    "disease cycle spread impact",
    "disease cycle spread",
    "disease cycle",
    "spread",
    "impact",
  ],
  prevention_summary: ["prevention summary", "prevention"],
};

const SUPPORTED_CORRECTION_GENERA = [
  {
    display_name: "Alternaria",
    normalized_key: "alternaria",
    predicted_class_name: "Alternaria_spp",
  },
  {
    display_name: "Aspergillus Section Flavi",
    normalized_key: "aspergillus section flavi",
    predicted_class_name: "Aspergillus_section_Flavi",
  },
  {
    display_name: "Aspergillus Section Nigri",
    normalized_key: "aspergillus section nigri",
    predicted_class_name: "Aspergillus_section_Nigri",
  },
  {
    display_name: "Fusarium",
    normalized_key: "fusarium",
    predicted_class_name: "Fusarium_spp",
  },
  {
    display_name: "Penicillium",
    normalized_key: "penicillium",
    predicted_class_name: "Penicillium_spp",
  },
  {
    display_name: "Rhizopus",
    normalized_key: "rhizopus",
    predicted_class_name: "Rhizopus_spp",
  },
] as const;

const asText = (value: unknown): string => {
  if (value == null) return "";
  return String(value).trim();
};

const normalizeLabel = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const findLegacyAdditionalInfoValue = (
  rows: Array<{title: string; description: string}>,
  aliases: string[]
): string => {
  if (!rows.length) return "";
  const normalizedAliases = aliases.map(normalizeLabel);

  for (const row of rows) {
    const title = normalizeLabel(asText(row.title));
    const description = asText(row.description);
    if (!title || !description) continue;

    for (const alias of normalizedAliases) {
      if (title === alias || title.includes(alias) || alias.includes(title)) {
        return description;
      }
    }
  }

  return "";
};

const upsertAdditionalInfoEntry = (
  rows: Array<{title: string; description: string}>,
  canonicalTitle: string,
  value: string,
  aliases: string[]
) => {
  if (!value) return;

  const acceptedTitles = [canonicalTitle, ...aliases].map(normalizeLabel);
  const index = rows.findIndex((row) => acceptedTitles.includes(normalizeLabel(asText(row.title))));

  if (index >= 0) {
    rows[index] = {title: canonicalTitle, description: value};
    return;
  }

  rows.push({title: canonicalTitle, description: value});
};

export function enrichMoldInfo(info: MoldDetails["info"]): MoldDetails["info"] {
  const entries = (info.additional_info || [])
    .filter((row) => row && typeof row.title === "string" && typeof row.description === "string")
    .map((row) => ({title: row.title, description: row.description}));

  const nextInfo = {...info} as MoldDetails["info"];

  for (const field of ENRICHED_MOLD_INFO_FIELDS) {
    const aliases = LEGACY_INFO_ALIASES[field.key] || [field.title];
    const directValue = asText((nextInfo as any)[field.key]);
    const legacyValue = findLegacyAdditionalInfoValue(entries, aliases);
    const resolvedValue = directValue || legacyValue;

    if (resolvedValue) {
      (nextInfo as any)[field.key] = resolvedValue;
      upsertAdditionalInfoEntry(entries, field.title, resolvedValue, aliases);
    }
  }

  return {
    ...nextInfo,
    additional_info: entries,
  };
}

export function normalizeMoldCompatibility(mold: Mold): Mold {
  if (!mold?.mold_details?.info) return mold;
  return {
    ...mold,
    mold_details: {
      ...mold.mold_details,
      info: enrichMoldInfo(mold.mold_details.info),
    },
  };
}

export const createMold = async (req: Request, res: Response) => {
  try {
    const moldName: string = req.body.moldName;
    const moldipediaId: string | undefined = req.body.moldipediaId || req.body.moldipedia_id;
    const symptoms: string[] | undefined = req.body.symptoms;
    const signs: string[] | undefined = req.body.signs;
    const characteristics: string[] | undefined = req.body.characteristics;

    const rawDetails = req.body.details;
    // parseMultipartJson can promote details.info/prevention to root and remove
    // details. Support both payload shapes so create doesn't lose user-entered fields.
    const promotedDetails: MoldDetails | undefined =
      (req.body.info && typeof req.body.info === "object") ||
      (req.body.prevention && typeof req.body.prevention === "object") ?
        {
          ...(req.body.info && typeof req.body.info === "object" ? {info: req.body.info} : {}),
          ...(req.body.prevention && typeof req.body.prevention === "object" ? {prevention: req.body.prevention} : {}),
        } as MoldDetails :
        undefined;
    const defaultDetails: MoldDetails = {
      info: {
        description: "",
        taxonomy: {kingdom: "", phylum: "", class: "", order: "", family: "", genus: ""},
        additional_info: [],
      },
      prevention: {
        physicalControl: "", mechanicalControl: "", culturalControl: "",
        biologicalControl: "", chemicalControl: "",
      },
    };
    const detailsToUse: MoldDetails = rawDetails ?? promotedDetails ?? defaultDetails;

    const enrichedDetails: MoldDetails = detailsToUse.info ?
      {
        ...detailsToUse,
        info: enrichMoldInfo(detailsToUse.info),
      } :
      detailsToUse;

    const status: MoldStatus = req.body.status ?? MoldStatus.Draft;

    const payload: Mold = {
      name: moldName,
      mold_details: enrichedDetails,
      status,
      ...(moldipediaId ? {moldipedia_id: moldipediaId} : {}),
      ...(symptoms ? {symptoms} : {}),
      ...(signs ? {signs} : {}),
      ...(characteristics ? {characteristics} : {}),
    };

    const mold: WithId<Mold> | null = await addMoldToFirestore(payload);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    req.auditTargetId = mold.id || "";
    return sendSuccess(res, normalizeMoldCompatibility(mold));
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMolds = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<Mold[]> | null = await retrieveAllMolds(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve molds", 404);
    const normalizedResult: PaginatedResult<Mold[]> = {
      ...result,
      snapshot: (result.snapshot || []).map((item) => normalizeMoldCompatibility(item)),
    };
    return sendSuccess(res, normalizedResult);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getSupportedCorrectionGenera = async (
  _req: Request,
  res: Response
) => {
  try {
    const enriched = await Promise.all(
      SUPPORTED_CORRECTION_GENERA.map(async (item) => {
        const mold = await retrieveMoldByPredictedClassName(
          item.predicted_class_name
        );
        return {
          ...item,
          exists_in_system: !!mold,
          status: mold?.status ?? null,
        };
      })
    );

    const available = enriched.filter(
      (item) => item.exists_in_system && item.status !== MoldStatus.Draft
    );

    const responseItems = (available.length > 0 ? available : enriched).map(
      (item) => ({
        display_name: item.display_name,
        normalized_key: item.normalized_key,
        predicted_class_name: item.predicted_class_name,
      })
    );

    return sendSuccess(res, {genera: responseItems});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: Mold | null = await retrieveMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, normalizeMoldCompatibility(mold));
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldByName = async (req: Request, res: Response) => {
  try {
    const name: string = req.params.name;
    const mold: Mold | null = await retrieveMoldByName(name);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, normalizeMoldCompatibility(mold));
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldByPredictedClassName = async (req: Request, res: Response) => {
  try {
    const classname: string = req.params.classname;
    const mold: Mold | null = await retrieveMoldByPredictedClassName(classname);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, normalizeMoldCompatibility(mold));
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldByPredictedClassId = async (req: Request, res: Response) => {
  try {
    const classId: string = req.params.classid;
    const classIdNum = parseInt(classId, 10);
    if (isNaN(classIdNum)) {
      return sendError(res, "Invalid predicted class ID: must be an integer", 400);
    }

    const mold: Mold | null = await retrieveMoldByPredictedClassId(classIdNum);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, normalizeMoldCompatibility(mold));
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const moldName: string | undefined = req.body.moldName;
    const details: MoldDetails | undefined = req.body.details;
    const moldipediaId: string | undefined = req.body.moldipediaId || req.body.moldipedia_id;
    const symptoms: string[] | undefined = req.body.symptoms;
    const signs: string[] | undefined = req.body.signs;
    const characteristics: string[] | undefined = req.body.characteristics;
    const status: MoldStatus | undefined = req.body.status;

    // Transform request shape { moldName, details, symptoms, signs, characteristics }
    // into Mold shape { name, mold_details, symptoms, signs, characteristics }
    const moldPayload: Partial<Mold> = {};
    if (moldName) {
      moldPayload.name = moldName;
    }
    if (details) {
      moldPayload.mold_details = {
        ...details,
        info: enrichMoldInfo(details.info),
      };
    }
    if (moldipediaId) {
      moldPayload.moldipedia_id = moldipediaId;
    }
    if (symptoms) {
      moldPayload.symptoms = symptoms;
    }
    if (signs) {
      moldPayload.signs = signs;
    }
    if (characteristics) {
      moldPayload.characteristics = characteristics;
    }

    // Auto-reset status to Draft when content changes (invalidates reviewed state)
    // Only preserve explicit status updates if no content is changing
    if (moldName !== undefined || details !== undefined) {
      moldPayload.status = MoldStatus.Draft;
    } else if (status !== undefined) {
      moldPayload.status = status;
    }

    const mold = await updateMoldInFirestore(id, moldPayload);
    if (!mold) return sendError(res, "Failed to update mold", 404);
    return sendSuccess(res, "Successfully updated mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMold(id);
    return sendSuccess(res, "Successfully deleted mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMold(id);
    return sendSuccess(res, "Successfully soft deleted mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


