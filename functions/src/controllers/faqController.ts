import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {FAQ, PaginatedResult} from "../types/types";
import {
  addFAQToFirestore,
  retrieveAllFAQ,
  retrieveFAQById,
  updateFAQInFirestore,
  removeFAQ,
  softRemoveFAQ,
} from "../services/faqService";

/**
 * Create a new FAQ
 *
 * @route POST /api/v1/faq
 * @access Curator/Admin
 */
export const createFAQ = async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line camelcase
    const {question, answer, user_id}: {question: string; answer: string; user_id: string} = req.body;
    // eslint-disable-next-line camelcase
    const faq = await addFAQToFirestore({question, answer, user_id});
    if (!faq) return sendError(res, "Failed to create FAQ", 400);
    req.auditTargetId = faq.id;
    return sendSuccess(res, faq);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Get all FAQs
 *
 * @route GET /api/v1/faq
 * @access Public
 */
export const getAllFAQ = async (req: Request, res: Response) => {
  try {
    const searchQuery: string | undefined = req.query.search as string | undefined;
    const limit = parseInt((req.query.limit as string) || "10");
    const pageToken = (req.query.pageToken as string) || undefined;
    const result: PaginatedResult<FAQ[]> | null = await retrieveAllFAQ(
      limit,
      pageToken,
      searchQuery
    );
    if (!result) return sendError(res, "Failed to retrieve FAQ", 500);
    return sendSuccess(res, {
      data: result.snapshot,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Get FAQ by ID
 *
 * @route GET /api/v1/faq/:id
 * @access Public
 */
export const getFAQById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const faq = await retrieveFAQById(id);
    if (!faq) return sendError(res, "FAQ not found", 404);
    return sendSuccess(res, faq);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Update FAQ
 *
 * @route PATCH /api/v1/faq/:id
 * @access Curator/Admin
 */
export const patchFAQ = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const details: Partial<FAQ> = req.body;
    const updated = await updateFAQInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update FAQ", 400);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Delete FAQ (hard delete)
 *
 * @route DELETE /api/v1/faq/hard/:id
 * @access Admin
 */
export const deleteFAQ = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = await removeFAQ(id);
    if (!result) return sendError(res, "Failed to delete FAQ", 400);
    return sendSuccess(res, {message: "FAQ deleted successfully"});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Soft delete FAQ
 *
 * @route DELETE /api/v1/faq/soft/:id
 * @access Admin
 */
export const softDeleteFAQ = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = await softRemoveFAQ(id);
    if (!result) return sendError(res, "Failed to soft delete FAQ", 400);
    return sendSuccess(res, {message: "FAQ soft deleted successfully"});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
