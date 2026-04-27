import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MoldCase, PaginatedResult} from "../types/types";
import {
  addMoldCaseToFirestore,
  retrieveAllMoldCasesByUser,
  retrieveAssignedMoldCases,
  retrieveMoldCasesByMoldipediaId,
  retrieveMoldCaseByReportId,
  updateMoldCaseInFirestore,
  removeMoldCase,
  softRemoveMoldCase,
  addCultivationLogToCase,
  updateCultivationDetailsInCase,
  getMoldCasesCountWithMetadata,
  searchAssignedMoldCasesByMycologist,
  retrieveMoldCaseById,
  getCultivationLogsFromCase,
  removeCultivationLogFromCase,
} from "../services/moldCaseService";
import {
  createCultureSessionForCase,
  deleteCultureSessionForCase,
  endCultureSessionEarlyForCase,
  listAvailableCultureSessionsByCase,
  listCultureSessionsByCase,
  reassignCultureSessionForCase,
} from "../services/cultureSessionService";
import {analyzeCultivationImage} from "../services/cultivationAnalysisService";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {Timestamp} from "firebase-admin/firestore";
import {retrieveMoldReportById, updateMoldReportInFirestore} from "../services/moldReportService";
import {performMoldLookup} from "../services/lookupService";
import {retrieveAllMoldipedia, retrieveMoldipediaByTitle} from "../services/moldipediaService";

const getActorContext = (req: Request) => {
  const userId = req.user?.id;
  const role = String(req.user?.user?.role || "").toLowerCase();
  return {userId, role};
};

const isAdminRole = (role: string) => role === "admin" || role === "administrator";

const canReadMoldCase = (moldCase: MoldCase, userId?: string, role?: string) => {
  if (isAdminRole(role || "")) return true;
  if (!userId) return false;
  return moldCase.mycologist_id === userId || moldCase.user_id === userId;
};

const canManageMoldCase = (moldCase: MoldCase, userId?: string, role?: string) => {
  if (isAdminRole(role || "")) return true;
  if (!userId) return false;
  return moldCase.mycologist_id === userId;
};

export const createMoldCase = async (req: Request, res: Response) => {
  try {
    // Accept body directly (no multipart) or from body.details if present
    const details: Omit<MoldCase, "is_archived"> = req.body.details || req.body;
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }
    if (details.user_id && details.user_id !== userId) {
      return sendError(res, "user_id must match authenticated user", 403);
    }

    const moldCase: MoldCase | null = await addMoldCaseToFirestore({
      ...details,
      user_id: userId,
      is_archived: false,
    });
    if (!moldCase) return sendError(res, "Failed to create mold case", 400);
    return sendSuccess(res, moldCase);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMoldCases = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAllMoldCasesByUser(uid, limit, false, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold cases", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAssignedMoldCases = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const mycologistId: string | undefined = req.user?.id;
  try {
    if (!mycologistId) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAssignedMoldCases(mycologistId, limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve assigned mold cases", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllArchivedMoldCases = async (
  req: Request,
  res: Response
) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) {
      devLog("getAllArchivedMoldCases: No UID found in req.user");
      return sendError(res, "Unauthorized", 401);
    }
    devLog(`getAllArchivedMoldCases: Fetching archived cases for UID=${uid}, limit=${limit}`);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAllMoldCasesByUser(uid, limit, true, pageToken);
    if (!result) {
      devLog(`getAllArchivedMoldCases: retrieveAllMoldCasesByUser returned null for UID=${uid}`);
      return sendError(res, "Failed to retrieve mold cases", 404);
    }
    devLog(`getAllArchivedMoldCases: Successfully retrieved ${result.snapshot.length} archived cases`);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error, "getAllArchivedMoldCases error:");
    return defaultError(res);
  }
};

export const patchMoldCase = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    // Support both req.body.details and direct properties
    const details: Partial<MoldCase> = req.body.details || req.body;
    if (!details || Object.keys(details).length === 0) {
      return sendError(res, "No update data provided", 400);
    }
    const updated = await updateMoldCaseInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update mold case", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMoldCase = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMoldCase(id);
    return sendSuccess(res, "Successfully deleted mold case");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMoldCase = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMoldCase(id);
    return sendSuccess(res, "Successfully soft deleted mold case.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldCaseByReportId = async (req: Request, res: Response) => {
  /**
   * GET /api/v1/mold-case/by-report/:id
   * Retrieve the mold case associated with a given mold report ID
   */
  try {
    const reportId: string = req.params.id;
    const {userId, role} = getActorContext(req);
    const linkedReport = await retrieveMoldReportById(reportId);
    if (!linkedReport) return sendError(res, "Mold report not found", 404);

    const moldCase = await retrieveMoldCaseByReportId(reportId, linkedReport.user_id);
    if (!moldCase) return sendError(res, "No mold case found for this report", 404);

    const isReportOwner = !!userId && linkedReport.user_id === userId;
    if (!canReadMoldCase(moldCase, userId, role) && !isReportOwner) {
      return sendError(res, "Forbidden", 403);
    }

    return sendSuccess(res, moldCase);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const addCultivationLog = async (req: Request, res: Response) => {
  /**
   * POST /api/v1/mold-case/:id/logs
   * Add a cultivation log entry to a mold case (stored in subcollection)
   */
  try {
    const caseId: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const logData = req.body;

    // Handle image upload if provided
    if (req.file) {
      const storagePath = generateStoragePath(StorageFolder.CULTIVATION_LOGS, req.file.originalname);
      const uploadedPath = await uploadFile(
        storagePath,
        req.file.buffer,
        req.file.mimetype
      );

      if (!uploadedPath) {
        return sendError(res, "Failed to upload cultivation log image", 500);
      }

      logData.image_url = uploadedPath;
    }

    const created = await addCultivationLogToCase(caseId, logData);
    if (!created) return sendError(res, "Failed to add cultivation log", 400);
    return sendSuccess(res, created, 201);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const updateCultivationDetails = async (req: Request, res: Response) => {
  /**
   * PATCH /api/v1/mold-case/:caseId/cultivation-details
   * Update cultivation details (in_vivo and/or in_vitro)
   */
  try {
    const caseId: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const details = (req.body ?? {}) as Record<string, any>;
    const {
      cultivation_details: cultivationDetailsPayload,
      start_date: startDate,
      end_date: endDate,
      ...fallbackDetails
    } = details;
    const normalizedCultivationDetails =
      (cultivationDetailsPayload ?? fallbackDetails ?? {}) as Record<string, any>;

    const initialObservations =
      normalizedCultivationDetails.initial_observations &&
      typeof normalizedCultivationDetails.initial_observations === "object" &&
      !Array.isArray(normalizedCultivationDetails.initial_observations) ?
        {...normalizedCultivationDetails.initial_observations} as Record<string, any> :
        {};

    const initialMicroscopic =
      typeof initialObservations.microscopic_description === "string" ?
        initialObservations.microscopic_description.trim() :
        "";

    if (!initialObservations.ai_snapshot && initialMicroscopic) {
      initialObservations.ai_snapshot = {
        identified_mold: initialMicroscopic,
        model_source: "fallback_from_initial_microscopic",
        captured_at: new Date().toISOString(),
      };
    } else if (initialObservations.ai_snapshot && initialMicroscopic) {
      const snapshot = initialObservations.ai_snapshot as Record<string, any>;
      if (!snapshot.identified_mold || String(snapshot.identified_mold).trim().length === 0) {
        snapshot.identified_mold = initialMicroscopic;
      }
    }

    if (Object.keys(initialObservations).length > 0) {
      normalizedCultivationDetails.initial_observations = initialObservations;
    }

    const normalizedDetails = {
      ...(startDate !== undefined ? {start_date: startDate} : {}),
      ...(endDate !== undefined ? {end_date: endDate} : {}),
      cultivation_details: normalizedCultivationDetails,
    };

    const updated = await updateCultivationDetailsInCase(caseId, normalizedDetails);
    if (!updated) return sendError(res, "Failed to update cultivation details", 400);

    // Re-run lookup in background if report has reported_* fields
    if (moldCase.mold_report_id) {
      const moldReport = await retrieveMoldReportById(moldCase.mold_report_id);
      if (moldReport) {
        devLog(`[updateCultivationDetails] Re-running lookup for report ${moldCase.mold_report_id}`);
        const reportedSymptoms = (moldReport as any).reported_symptoms || [];
        const reportedSigns = (moldReport as any).reported_signs || [];
        const reportedCharacteristics = (moldReport as any).reported_characteristics || [];

        // Extract characteristics from cultivation details if available.
        // Mobile sends nested `cultivation_details`, while some clients may send flat shape.
        const detailsPayload = normalizedCultivationDetails;
        const additionalCharacteristics: string[] = [];
        if (Array.isArray(detailsPayload.initial_observations?.characteristics)) {
          additionalCharacteristics.push(
            ...detailsPayload.initial_observations.characteristics.map((v: unknown) => String(v))
          );
        }

        const reportedMoldNames: string[] = [];

        if (initialMicroscopic) {
          reportedMoldNames.push(initialMicroscopic);
        }

        const snapshotIdentified = (detailsPayload.initial_observations?.ai_snapshot as any)?.identified_mold;
        if (typeof snapshotIdentified === "string" && snapshotIdentified.trim()) {
          reportedMoldNames.push(snapshotIdentified.trim());
        }

        const allCharacteristics = [...reportedCharacteristics, ...additionalCharacteristics];

        // Run lookup in background
        performMoldLookup(reportedSymptoms, reportedSigns, allCharacteristics, reportedMoldNames)
          .then(async (lookupResults) => {
            try {
              await updateMoldReportInFirestore(moldCase.mold_report_id, {
                lookup_results: lookupResults.map((r) => ({
                  ...r,
                  timestamp: Timestamp.now(),
                })),
              });

              if (lookupResults.length > 0) {
                const topResult = lookupResults[0] as Record<string, any>;
                const confidenceRaw = topResult.confidence;
                const confidenceValue =
                  typeof confidenceRaw === "number" ?
                    confidenceRaw :
                    Number(confidenceRaw);
                const normalizedConfidence =
                  Number.isFinite(confidenceValue) ? confidenceValue : null;
                const confidenceDisplay =
                  normalizedConfidence === null ?
                    "" :
                    `${normalizedConfidence <= 1 ? (normalizedConfidence * 100).toFixed(1) : normalizedConfidence.toFixed(1)}%`;

                await updateCultivationDetailsInCase(caseId, {
                  cultivation_details: {
                    initial_observations: {
                      ai_snapshot: {
                        identified_mold:
                          topResult.moldName ||
                          topResult.mold_name ||
                          topResult.identified_mold ||
                          "",
                        mold_id:
                          topResult.moldId ||
                          topResult.mold_id ||
                          "",
                        confidence: normalizedConfidence === null ? undefined : normalizedConfidence,
                        confidence_display: confidenceDisplay,
                        model_source: "lookup_refresh",
                        captured_at: new Date().toISOString(),
                        top_predictions: lookupResults,
                      },
                    },
                  },
                });
              }

              devLog(`[updateCultivationDetails] ✅ Updated lookup results: ${lookupResults.length} matches`);
            } catch (err) {
              devLog(`[updateCultivationDetails] ⚠️ Failed to update lookup results: ${err}`);
            }
          })
          .catch((err) => {
            devLog(`[updateCultivationDetails] ❌ Lookup failed: ${err}`);
          });
      }
    }

    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const analyzeCultivationLogImage = async (req: Request, res: Response) => {
  /**
   * POST /api/v1/mold-case/:id/analyze-cultivation
   * Analyze cultivation image using Gemini AI
   *
   * Body:
   * - type: "vivo" | "vitro" (cultivation type)
   * - file: image file (via multer)
   */
  try {
    const cultivationType = req.body.type as "vivo" | "vitro";

    if (!cultivationType || (cultivationType !== "vivo" && cultivationType !== "vitro")) {
      return sendError(res, "Invalid cultivation type. Must be 'vivo' or 'vitro'", 400);
    }

    if (!req.file) {
      return sendError(res, "No image file provided", 400);
    }

    // Analyze the image using Gemini
    const analysis = await analyzeCultivationImage(req.file.buffer, cultivationType);

    if (!analysis) {
      return sendError(res, "Failed to analyze image", 500);
    }

    return sendSuccess(res, analysis);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const searchAssignedMoldCases = async (req: Request, res: Response) => {
  try {
    const mycologistId = req.user?.id;
    if (!mycologistId) {
      return sendError(res, "Not authenticated", 401);
    }

    const searchQuery: string | undefined = req.query.search as string | undefined;
    const priority: string | undefined = req.query.priority as string | undefined;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as string | undefined;


    const result = await searchAssignedMoldCasesByMycologist(
      mycologistId,
      searchQuery,
      priority,
      limit,
      pageToken
    );

    if (!result) {
      return sendError(res, "Failed to search mold cases", 500);
    }

    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Get mold cases count with metadata (latest createdAt timestamp)
 * Admin only endpoint
 *
 * @route GET /api/v1/mold-case/counts/metadata
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: Count and metadata, 500: Server error
 * @access Admin only
 */
export const getMoldCasesCountMetadataController = async (req: Request, res: Response) => {
  try {
    const metadata = await getMoldCasesCountWithMetadata();
    if (!metadata) {
      return sendError(res, "Failed to retrieve mold cases metadata", 500);
    }

    return sendSuccess(res, metadata);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

// ─── Case History / Archived ────────────────────────────────────────────────

export const getMoldCaseById = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canReadMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    return sendSuccess(res, moldCase);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const archiveMoldCase = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const updated = await updateMoldCaseInFirestore(id, {is_archived: true} as Partial<MoldCase>);
    if (!updated) return sendError(res, "Failed to archive mold case", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const unarchiveMoldCase = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const updated = await updateMoldCaseInFirestore(id, {is_archived: false} as Partial<MoldCase>);
    if (!updated) return sendError(res, "Failed to unarchive mold case", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getCultivationLogs = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canReadMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const pageToken = req.query.pageToken as string | undefined;
    const result = await getCultivationLogsFromCase(id, limit, pageToken);
    if (result === null) return sendError(res, "Mold case not found", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const removeCultivationLog = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const logId: string = req.params.logId;
    if (!logId || !logId.trim()) {
      return sendError(res, "Log ID is required.", 400);
    }
    const deleted = await removeCultivationLogFromCase(id, logId);
    if (!deleted) return sendError(res, "Mold case or log not found", 404);
    return sendSuccess(res, {deleted: true});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const listCultureSessions = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canReadMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const limit = parseInt(req.query.limit as string, 10) || 100;
    const pageToken = req.query.pageToken as string | undefined;
    const sessions = await listCultureSessionsByCase(caseId, limit, pageToken);
    if (!sessions) return sendError(res, "Failed to retrieve culture sessions", 400);
    return sendSuccess(res, sessions);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const listAvailableCultureSessions = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canReadMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const sessions = await listAvailableCultureSessionsByCase(caseId);
    if (sessions === null) return sendError(res, "Failed to retrieve available cultures", 400);
    return sendSuccess(res, sessions);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const createCultureSession = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const created = await createCultureSessionForCase(caseId, {
      name: req.body.name,
      target_at: req.body.target_at,
    });
    if (!created) return sendError(res, "Failed to create culture session", 400);
    return sendSuccess(res, created, 201);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const endCultureSessionEarly = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const cultureId = req.params.cultureId;

    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const ended = await endCultureSessionEarlyForCase(caseId, cultureId);
    if (!ended) return sendError(res, "Culture session not found", 404);
    return sendSuccess(res, ended);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const reassignCultureSession = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const cultureId = req.params.cultureId;

    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const updated = await reassignCultureSessionForCase(caseId, cultureId, {
      target_at: req.body.target_at,
    });
    if (!updated) return sendError(res, "Culture session not found", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteCultureSession = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const cultureId = req.params.cultureId;

    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const deleted = await deleteCultureSessionForCase(caseId, cultureId);
    if (!deleted) return sendError(res, "Culture session not found", 404);
    return sendSuccess(res, {deleted: true});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const finalizeVerdict = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const {
      moldId,
      moldName,
      moldipedia_id: providedMoldipediaId,
      confidence,
      mycologist_notes: mycologistNotes,
    } = req.body;

    // Validate required fields
    // moldId is now optional to support verdicts for predicted classes not in the database
    // moldId will be null when verdict is for a mold not in the database (fallback to predicted_class_name)
    if (!moldName || !moldName.trim()) {
      return sendError(res, "moldName is required", 400);
    }
    if (typeof confidence !== "number" || confidence < 0 || confidence > 100) {
      return sendError(res, "confidence must be a number between 0 and 100", 400);
    }
    const normalizedMoldName = moldName.trim();

    // Retrieve the case to get the report ID
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) {
      return sendError(res, "Mold case not found", 404);
    }

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    // Update the mold case with final verdict
    let matchedWikiMold: any = null;
    let matchedWikiMoldId: string | undefined =
      typeof providedMoldipediaId === "string" && providedMoldipediaId.trim() ?
        providedMoldipediaId.trim() :
        undefined;
    try {
      if (!matchedWikiMoldId && moldName && moldName.trim()) {
        matchedWikiMold = await retrieveMoldipediaByTitle(normalizedMoldName);
        matchedWikiMoldId = (matchedWikiMold as any)?.id;

        if (!matchedWikiMoldId) {
          const moldipediaResponse = await retrieveAllMoldipedia(10, undefined, normalizedMoldName);
          const candidates = moldipediaResponse?.snapshot || [];
          if (Array.isArray(candidates) && candidates.length > 0) {
            matchedWikiMold = candidates[0];
            matchedWikiMoldId = (matchedWikiMold as any)?.id;
          }
        }
      }
    } catch (matchErr) {
      devLog(`[finalizeVerdict] WikiMold lookup failed: ${matchErr}`);
    }

    // moldId may be null for verdicts from predicted classes not in the database
    const verdict: NonNullable<MoldCase["final_verdict"]> = {
      moldId: moldId ?? null,
      confidence,
      verdict_timestamp: Timestamp.now(),
      ...(mycologistNotes !== undefined ? {mycologist_notes: mycologistNotes} : {}),
      ...(matchedWikiMoldId ? {moldipedia_id: matchedWikiMoldId} : {}),
      ...(moldId == null ? {verdict_fallback_name: normalizedMoldName} : {}),
    };

    const updatedCase = await updateMoldCaseInFirestore(caseId, {
      final_verdict: verdict,
      // Keep the case active after resolution; explicit closure/archive is a separate action.
      is_archived: false,
      end_date: moldCase.end_date || Timestamp.now(),
    });

    if (!updatedCase) {
      return sendError(res, "Failed to update mold case with verdict", 400);
    }

    // Update the associated report status to resolved and surface failures explicitly.
    let reportSyncWarning: string | null = null;
    if (moldCase.mold_report_id) {
      try {
        const linkedReport = await retrieveMoldReportById(moldCase.mold_report_id);
        if (!linkedReport) {
          reportSyncWarning = "Verdict saved, but linked report could not be found";
        } else if (linkedReport.status === "rejected" || linkedReport.status === "closed") {
          reportSyncWarning = `Verdict saved, but report status '${linkedReport.status}' cannot transition to 'resolved'`;
        }

        if (reportSyncWarning) {
          devLog(`[finalizeVerdict] Warning: ${reportSyncWarning}`);
        }

        if (!reportSyncWarning) {
          const reportUpdated = await updateMoldReportInFirestore(moldCase.mold_report_id, {
            status: "resolved",
          });
          if (!reportUpdated) {
            reportSyncWarning = "Verdict saved, but report status sync did not persist";
            devLog(`[finalizeVerdict] Warning: Report status sync returned no update for report ${moldCase.mold_report_id}`);
          }
        }
      } catch (err) {
        reportSyncWarning = "Verdict saved, but report status sync failed";
        devLog(`[finalizeVerdict] Warning: Failed to update report status: ${err}`);
      }
    }

    devLog(`[finalizeVerdict] ✅ Verdict finalized for case ${caseId}: ${moldName} (${confidence}%)`);
    return sendSuccess(res, {
      moldCaseId: caseId,
      report_owner_id: moldCase.user_id ?? null,
      case_name: moldCase.name ?? "",
      final_verdict: {
        ...verdict,
        moldName: normalizedMoldName,
      },
      report_sync_warning: reportSyncWarning,
      matched_wikimold: matchedWikiMold,
    });
  } catch (error) {
    devLog("[finalizeVerdict] Error:", String(error));
    return defaultError(res);
  }
};

export const getMoldCasesByMoldipediaId = async (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    const includeEvidence = ["1", "true", "yes", "on"].includes(
      String(req.query.includeEvidence || "").toLowerCase()
    );

    const cases = await retrieveMoldCasesByMoldipediaId(id);
    if (!cases) {
      return sendError(res, "No cases found for this moldipedia article", 404);
    }

    const toMillis = (value: any): number => {
      if (!value) return 0;
      if (value instanceof Timestamp) return value.toDate().getTime();
      if (typeof value === "object" && typeof value.toDate === "function") {
        return value.toDate().getTime();
      }
      if (typeof value === "object" && typeof value._seconds === "number") {
        return value._seconds * 1000;
      }
      if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return 0;
    };

    const normalizeLogType = (value: unknown): string =>
      String(value || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    const toTextList = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item || "").trim())
          .filter((item) => item.length > 0);
      }

      const text = String(value || "").trim();
      return text.length > 0 ? [text] : [];
    };

    const sortedCases = [...cases].sort((a: any, b: any) => {
      const aVerdict = toMillis(a?.final_verdict?.verdict_timestamp);
      const bVerdict = toMillis(b?.final_verdict?.verdict_timestamp);
      if (aVerdict !== bVerdict) return bVerdict - aVerdict;

      const aCreated = toMillis(a?.metadata?.created_at);
      const bCreated = toMillis(b?.metadata?.created_at);
      return bCreated - aCreated;
    });

    if (!includeEvidence) {
      return sendSuccess(res, sortedCases);
    }

    const enrichedCases = await Promise.all(
      sortedCases.map(async (entry: any) => {
        const caseId = String(entry?.id || "").trim();

        let logs: any[] = [];
        if (caseId.length > 0) {
          const logsResult = await getCultivationLogsFromCase(caseId, 50);
          logs = Array.isArray(logsResult?.snapshot) ? logsResult!.snapshot : [];
        }

        const latestByType = (type: "vivo" | "vitro") => {
          const matches = logs
            .filter((log: any) => {
              const normalized = normalizeLogType(log?.type);
              if (type === "vivo") return normalized === "vivo" || normalized === "invivo";
              return normalized === "vitro" || normalized === "invitro";
            })
            .sort((a: any, b: any) => {
              const aTs = toMillis(a?.created_at ?? a?.metadata?.created_at);
              const bTs = toMillis(b?.created_at ?? b?.metadata?.created_at);
              return bTs - aTs;
            });

          return matches.length > 0 ? matches[0] : null;
        };

        const initial = (entry?.cultivation_details && typeof entry.cultivation_details === "object") ?
          entry.cultivation_details as Record<string, any> :
          {};
        const initialObservations = (initial.initial_observations && typeof initial.initial_observations === "object") ?
          initial.initial_observations as Record<string, any> :
          {};

        const initialSummary = {
          symptoms: toTextList(initialObservations.symptoms),
          characteristics: toTextList(initialObservations.characteristics),
          microscopic: String(initialObservations.microscopic_description || "").trim(),
          macroscopic: String(initialObservations.macroscopic_description || "").trim(),
        };

        const vivo = latestByType("vivo");
        const vitro = latestByType("vitro");

        const evidenceSummary = {
          initial: initialSummary,
          in_vivo: {
            characteristics: (vivo?.characteristics && typeof vivo.characteristics === "object") ? vivo.characteristics : {},
            observed_at: vivo?.created_at ?? vivo?.metadata?.created_at ?? null,
          },
          in_vitro: {
            characteristics: (vitro?.characteristics && typeof vitro.characteristics === "object") ? vitro.characteristics : {},
            observed_at: vitro?.created_at ?? vitro?.metadata?.created_at ?? null,
          },
          rationale_notes: String(entry?.final_verdict?.mycologist_notes || "").trim() || null,
          threshold: {
            type: "global",
            value: 70,
          },
        };

        return {
          ...entry,
          cultivation_logs: logs,
          evidence_summary: evidenceSummary,
        };
      })
    );

    return sendSuccess(res, enrichedCases);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
