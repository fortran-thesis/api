import { Router, Request, Response } from 'express';
import { verifyUser } from '../middlewares/verification';

const router = Router();

/**
 * @swagger
 * /api/v1/test/secure:
 *   get:
 *     summary: Test endpoint requiring verification
 *     tags: [Test]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification passed
 *       401:
 *         description: Verification failed
 */
router.get('/secure', verifyUser(), (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: 'Verification passed!' });
});

export default router;
