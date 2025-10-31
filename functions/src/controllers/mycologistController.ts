import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { registerMycologist } from "../services/mycologistService";

export const registerMycologistController = async (
  req: Request,
  res: Response
) => {
  /**
   * @swagger
   * /api/v1/mycologists/register:
   *   post:
   *     summary: Register a new mycologist account (admin only)
   *     tags: [Mycologists]
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
   *               resume:
   *                 type: string
   *                 description: Optional resume or bio
   *               links:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Optional array of profile URLs
   *     responses:
   *       200:
   *         description: Mycologist registered successfully
   *       400:
   *         description: Validation error or registration failed
   *       401:
   *         description: Unauthorized (not admin)
   *       500:
   *         description: Server error
   */
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
