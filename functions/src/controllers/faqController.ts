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
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";

/**
 * Create a new FAQ
 *
 * @route POST /api/v1/faq
 * @access Curator/Admin
 */
export const createFAQ = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/faq:
   *   post:
   *     summary: Create a new FAQ
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Create a new FAQ entry. Requires curator or admin role.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               question:
   *                 type: string
   *               answer:
   *                 type: string
   *     responses:
   *       200:
   *         description: FAQ created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    const {question, answer, user_id}: {question: string; answer: string; user_id: string} = req.body;
    const faq = await addFAQToFirestore({question, answer, user_id});
    if (!faq) return sendError(res, "Failed to create FAQ", 400);
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.CREATE, "Created FAQ", faq.id);
    }
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
  /**
   * @swagger
   * /api/v1/faq:
   *   get:
   *     summary: Get all FAQ entries
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve all FAQ entries with pagination.
   *     parameters:
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: pageToken
   *         schema:
   *           type: string
   *         description: Pagination token
   *     responses:
   *       200:
   *         description: FAQs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                 nextPageToken:
   *                   type: string
   *       500:
   *         description: Server error
   */
  try {
    const pageSize = parseInt((req.query.pageSize as string) || "10");
    const pageToken = (req.query.pageToken as string) || undefined;
    const result: PaginatedResult<FAQ[]> | null = await retrieveAllFAQ(
      pageSize,
      pageToken
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
  /**
   * @swagger
   * /api/v1/faq/{id}:
   *   get:
   *     summary: Get FAQ by ID
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: FAQ ID
   *     responses:
   *       200:
   *         description: FAQ found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       404:
   *         description: FAQ not found
   *       500:
   *         description: Server error
   */
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
  /**
   * @swagger
   * /api/v1/faq/{id}:
   *   patch:
   *     summary: Update FAQ
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               question:
   *                 type: string
   *               answer:
   *                 type: string
   *     responses:
   *       200:
   *         description: FAQ updated successfully
   *       404:
   *         description: FAQ not found
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    const details: Partial<FAQ> = req.body;
    const updated = await updateFAQInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update FAQ", 400);
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.UPDATE, "Updated FAQ", id);
    }
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
  /**
   * @swagger
   * /api/v1/faq/hard/{id}:
   *   delete:
   *     summary: Delete FAQ permanently
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: FAQ deleted successfully
   *       400:
   *         description: Failed to delete FAQ
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    const result = await removeFAQ(id);
    if (!result) return sendError(res, "Failed to delete FAQ", 400);
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.DELETE, "Deleted FAQ", id);
    }
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
  /**
   * @swagger
   * /api/v1/faq/soft/{id}:
   *   delete:
   *     summary: Soft delete FAQ
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: FAQ soft deleted successfully
   *       400:
   *         description: Failed to soft delete FAQ
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    const result = await softRemoveFAQ(id);
    if (!result) return sendError(res, "Failed to soft delete FAQ", 400);
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.SOFT_DELETE, "Soft deleted FAQ", id);
    }
    return sendSuccess(res, {message: "FAQ soft deleted successfully"});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
