import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {registerMycologist} from "../services/mycologistService";

/**
 * @swagger
 * /api/v1/mycologist/register:
 *   post:
 *     summary: Register a new mycologist account (admin only)
 *     tags: [Mycologist]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Admin endpoint to create a new mycologist account with auth credentials and profile details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - username
 *               - email
 *               - password
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mycologist registered successfully
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
 *                     userId:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: Validation error or registration failed
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
 *       401:
 *         description: Unauthorized (not admin)
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
export const registerMycologistController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await registerMycologist(req.body);
    if (!result) {
      return sendError(res, "Failed to register mycologist", 400);
    }
    return sendSuccess(res, {
      userId: result.userId,
      message: result.message,
    });
  } catch (error) {
    devLog(error, "REGISTER_MYCOLOGIST_CONTROLLER");
    return defaultError(res);
  }
};






