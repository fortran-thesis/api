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
  softRemoveMold,
  updateMoldInFirestore,
} from "../services/moldService";
import {Mold, MoldDetails, PaginatedResult, WithId} from "../types/types";

/**
 * @swagger
 * /api/v1/mold:
 *   post:
 *     summary: Create a new mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description:
 *       - Requires authentication (Bearer token or session cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - moldName
 *               - details
 *             properties:
 *               moldName:
 *                 type: string
 *                 description: Name of the mold
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional symptoms list for lookup matching
 *               signs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional signs list for lookup matching
 *               characteristics:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional characteristics list for lookup matching
 *               details:
 *                 type: object
 *                 description: Mold details including info and prevention. Contains nested mold biology, taxonomy and control recommendations. For multipart/form-data, details can be sent as a JSON string, and parseMultipartJson middleware will parse it to object.
 *                 properties:
 *                   info:
 *                     type: object
 *                     properties:
 *                       description:
 *                         type: string
 *                       taxonomy:
 *                         type: object
 *                         properties:
 *                           kingdom:
 *                             type: string
 *                           phylum:
 *                             type: string
 *                           class:
 *                             type: string
 *                           order:
 *                             type: string
 *                           family:
 *                             type: string
 *                           genus:
 *                             type: string
 *                       additional_info:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                             description:
 *                               type: string
 *                       overview:
 *                         type: string
 *                       health_risks:
 *                         type: string
 *                       affected_hosts:
 *                         type: string
 *                       symptoms_and_signs:
 *                         type: string
 *                       disease_cycle_spread_impact:
 *                         type: string
 *                       prevention_summary:
 *                         type: string
 *                       predicted_class_id:
 *                         type: number
 *                       predicted_class_name:
 *                         type: string
 *                   prevention:
 *                     type: object
 *                     properties:
 *                       physicalControl:
 *                         type: string
 *                       mechanicalControl:
 *                         type: string
 *                       culturalControl:
 *                         type: string
 *                       biologicalControl:
 *                         type: string
 *                       chemicalControl:
 *                         type: string
 *                 example:
 *                   info:
 *                     description: "Dry spores from a garage wall"
 *                     taxonomy:
 *                       kingdom: "Fungi"
 *                       phylum: "Ascomycota"
 *                       class: "Eurotiomycetes"
 *                       order: "Eurotiales"
 *                       family: "Trichocomaceae"
 *                       genus: "Aspergillus"
 *                     overview: "Common indoor mold species"
 *                     health_risks: "Respiratory irritation"
 *                     affected_hosts: "Human, animal"
 *                     symptoms_and_signs: "Sneezing, coughing"
 *                     disease_cycle_spread_impact: "High in damp conditions"
 *                     prevention_summary: "Improve ventilation and reduce humidity"
 *                     predicted_class_id: 1
 *                     predicted_class_name: "Aspergillus"
 *                     additional_info:
 *                       - title: "Growth pattern"
 *                         description: "Often forms powdery patches"
 *                   prevention:
 *                     physicalControl: "Keep dry"
 *                     mechanicalControl: "Clean surfaces"
 *                     culturalControl: "Ventilate rooms"
 *                     biologicalControl: "Not applicable"
 *                     chemicalControl: "Anti-fungal sprays"
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Successfully created mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mold_details:
 *                       type: object
 *                       properties:
 *                         info:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             taxonomy:
 *                               type: object
 *                               properties:
 *                                 kingdom:
 *                                   type: string
 *                                 phylum:
 *                                   type: string
 *                                 class:
 *                                   type: string
 *                                 order:
 *                                   type: string
 *                                 family:
 *                                   type: string
 *                                 genus:
 *                                   type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   title:
 *                                     type: string
 *                                   description:
 *                                     type: string
 *                         prevention:
 *                           type: object
 *                           properties:
 *                             fungicide:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   title:
 *                                     type: string
 *                                   description:
 *                                     type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       404:
 *         description: Failed to create mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
const ENRICHED_MOLD_INFO_FIELDS = [
  {key: "overview", title: "Overview"},
  {key: "health_risks", title: "Health Risks"},
  {key: "affected_hosts", title: "Affected Hosts"},
  {key: "symptoms_and_signs", title: "Symptoms and Signs"},
  {key: "disease_cycle_spread_impact", title: "Disease Cycle / Spread / Impact"},
  {key: "prevention_summary", title: "Prevention Summary"},
] as const;

function enrichMoldInfo(info: MoldDetails["info"]): MoldDetails["info"] {
  const entries = info.additional_info ? [...info.additional_info] : [];

  for (const field of ENRICHED_MOLD_INFO_FIELDS) {
    const value = (info as any)[field.key] as string | undefined;
    if (value && !entries.some((item) => item.title === field.title)) {
      entries.push({title: field.title, description: value});
    }
  }

  return {
    ...info,
    additional_info: entries,
  };
}

export const createMold = async (req: Request, res: Response) => {
  try {
    const moldName: string = req.body.moldName;
    const details: MoldDetails = req.body.details;
    const moldipediaId: string | undefined = req.body.moldipediaId || req.body.moldipedia_id;
    const symptoms: string[] | undefined = req.body.symptoms;
    const signs: string[] | undefined = req.body.signs;
    const characteristics: string[] | undefined = req.body.characteristics;

    const enrichedDetails: MoldDetails = details.info ?
      {
        ...details,
        info: enrichMoldInfo(details.info),
      } :
      details;

    const payload: Mold = {
      name: moldName,
      mold_details: enrichedDetails,
      ...(moldipediaId ? {moldipedia_id: moldipediaId} : {}),
      ...(symptoms ? {symptoms} : {}),
      ...(signs ? {signs} : {}),
      ...(characteristics ? {characteristics} : {}),
    };

    const mold: WithId<Mold> | null = await addMoldToFirestore(payload);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    req.auditTargetId = mold.id || "";
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold:
 *   get:
 *     summary: Get all molds
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all molds with pagination. Requires curator role. Query validated via PaginationQuerySchema.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Cursor token for pagination
 *     responses:
 *       200:
 *         description: List of molds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     snapshot:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           mold_details:
 *                             type: object
 *                             properties:
 *                               info:
 *                                 type: object
 *                               prevention:
 *                                 type: object
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Failed to retrieve molds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
export const getAllMolds = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<Mold[]> | null = await retrieveAllMolds(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/{id}:
 *   get:
 *     summary: Get mold by ID
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific mold by its ID. Requires curator role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     responses:
 *       200:
 *         description: Mold retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mold_details:
 *                       type: object
 *                       properties:
 *                         info:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             taxonomy:
 *                               type: object
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                         prevention:
 *                           type: object
 *                           properties:
 *                             fungicide:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *       404:
 *         description: Mold not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
export const getMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: Mold | null = await retrieveMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/name/{name}:
 *   get:
 *     summary: Get mold by name
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific mold by its name. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold name
 *     responses:
 *       200:
 *         description: Mold retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mold_details:
 *                       type: object
 *                       properties:
 *                         info:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             taxonomy:
 *                               type: object
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                         prevention:
 *                           type: object
 *                           properties:
 *                             fungicide:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *       404:
 *         description: Mold not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
export const getMoldByName = async (req: Request, res: Response) => {
  try {
    const name: string = req.params.name;
    const mold: Mold | null = await retrieveMoldByName(name);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/predicted-class-name/{classname}:
 *   get:
 *     summary: Get mold by predicted class name (taxonomy name from ML model)
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific mold by its predicted_class_name (e.g., "Aspergillus_section_Nigri"). Requires authentication.
 *     parameters:
 *       - in: path
 *         name: classname
 *         required: true
 *         schema:
 *           type: string
 *         description: Predicted class name from ML model (e.g., Aspergillus_section_Nigri)
 *     responses:
 *       200:
 *         description: Mold retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Mold not found
 *       500:
 *         description: Server error
 */
export const getMoldByPredictedClassName = async (req: Request, res: Response) => {
  try {
    const classname: string = req.params.classname;
    const mold: Mold | null = await retrieveMoldByPredictedClassName(classname);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/{id}:
 *   patch:
 *     summary: Update mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Update a mold's details by ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moldName:
 *                 type: string
 *                 description: Optional new mold name
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional symptom keywords for lookup matching
 *               signs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional sign keywords for lookup matching
 *               characteristics:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional characteristics for lookup matching
 *               details:
 *                 type: object
 *                 description: Mold details to update (partial)
 *                 properties:
 *                   info:
 *                     type: object
 *                     properties:
 *                       description:
 *                         type: string
 *                       taxonomy:
 *                         type: object
 *                         properties:
 *                           kingdom:
 *                             type: string
 *                           phylum:
 *                             type: string
 *                           class:
 *                             type: string
 *                           order:
 *                             type: string
 *                           family:
 *                             type: string
 *                           genus:
 *                             type: string
 *                       additional_info:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                             description:
 *                               type: string
 *                       overview:
 *                         type: string
 *                       health_risks:
 *                         type: string
 *                       affected_hosts:
 *                         type: string
 *                       symptoms_and_signs:
 *                         type: string
 *                       disease_cycle_spread_impact:
 *                         type: string
 *                       prevention_summary:
 *                         type: string
 *                       predicted_class_id:
 *                         type: number
 *                       predicted_class_name:
 *                         type: string
 *                   prevention:
 *                     type: object
 *                     properties:
 *                       physicalControl:
 *                         type: string
 *                       mechanicalControl:
 *                         type: string
 *                       culturalControl:
 *                         type: string
 *                       biologicalControl:
 *                         type: string
 *                       chemicalControl:
 *                         type: string
 *     responses:
 *       200:
 *         description: Successfully updated mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: "Successfully updated mold."
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       404:
 *         description: Mold not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
export const patchMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const moldName: string | undefined = req.body.moldName;
    const details: MoldDetails | undefined = req.body.details;
    const moldipediaId: string | undefined = req.body.moldipediaId || req.body.moldipedia_id;
    const symptoms: string[] | undefined = req.body.symptoms;
    const signs: string[] | undefined = req.body.signs;
    const characteristics: string[] | undefined = req.body.characteristics;

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

    const mold = await updateMoldInFirestore(id, moldPayload);
    if (!mold) return sendError(res, "Failed to update mold", 404);
    return sendSuccess(res, "Successfully updated mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/hard/{id}:
 *   delete:
 *     summary: Hard delete a mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Permanently delete a mold by ID. Requires admin role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     responses:
 *       200:
 *         description: Successfully deleted mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: "Successfully deleted mold"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
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

/**
 * @swagger
 * /api/v1/mold/soft/{id}:
 *   delete:
 *     summary: Soft delete a mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Soft delete a mold by marking it as archived. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     responses:
 *       200:
 *         description: Successfully soft deleted mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: "Successfully soft deleted mold."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
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


