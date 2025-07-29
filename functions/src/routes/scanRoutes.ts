import { Request, Response, Router } from "express";
import { upload } from "../middlewares/upload";
import { verifyUser } from "../middlewares/verification";
import { sanitizeBody } from "../middlewares/sanitation";

const router = Router()

router.post('/', sanitizeBody, validateBody(), verifyUser(), upload.single('photo'), async (req: Request, res: Response) => {

})

router.get('/', verifyUser(), async (req: Request, res: Response) => {

})

router.get('/:id', async (req: Request, res: Response) => {

})

router.patch('/:id', async (req: Request, res: Response) => {

})

router.delete('/hard/:id', async (req: Request, res: Response) => {

})

router.delete('/soft/:id', async (req: Request, res: Response) => {

})

export default router