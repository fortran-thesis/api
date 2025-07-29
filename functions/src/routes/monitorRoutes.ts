import { Request, Response, Router } from "express";
import { upload } from "../middlewares/upload";
import { verifyUser } from "../middlewares/verification";
import { sanitizeBody } from "../middlewares/sanitation";

const router = Router()

router.post('/', verifyUser(), async(req: Request, res: Response) => {
    
})

router.get('/', verifyUser(), async(req: Request, res: Response) => {
    
})

router.get('/:id', verifyUser(), async(req: Request, res: Response) => {
    
})

router.patch('/:id', verifyUser(), async(req: Request, res: Response) => {
    
})

router.delete('hard/:id', verifyUser(), async(req: Request, res: Response) => {
    
})

router.delete('/soft/:id', verifyUser(), async(req: Request, res: Response) => {
    
})

export default router