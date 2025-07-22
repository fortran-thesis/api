import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import { createMold, deleteMold, getAllMolds, getMoldById, getMoldByName, patchMold } from "../controllers/moldController";
import { sanitizeBody, sanitizeParams } from "../middlewares/sanitation";
import { validateBody, validateParams } from "../middlewares/validation";

const router = Router();

router.post("/", verifyUser(), 
  async (req: Request, res: Response) => {
    createMold(req, res);
  }
);

router.get("/", verifyUser(), 
  async (req: Request, res: Response) => {
    getAllMolds(req, res);
  }
);

router.get("/:id", sanitizeParams, validateParams(UserIdSchema), verifyUser(), 
  async (req: Request, res: Response) => {
    getMoldById(req, res);
  }
);

router.get("/name/:name", sanitizeParams, validateParams(EmailSchema), verifyUser(), 
  async (req: Request, res: Response) => {
    getMoldByName(req, res);
  }
);

router.patch("/:id", 
  sanitizeParams, validateParams(UserIdSchema), 
  sanitizeBody, validateBody(UserDetailsSchema), verifyUser(), 
  async (req: Request, res: Response) => {
    patchMold(req, res);
  }
);

router.delete("/:id", sanitizeParams, validateParams(UserIdSchema), verifyUser(Role.ADMIN), 
  async (req: Request, res: Response) => {
    deleteMold(req, res);
  }
);