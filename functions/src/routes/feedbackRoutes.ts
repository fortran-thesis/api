import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";

const router = Router();

router.post("/", verifyUser(), async (_req: Request, _res: Response) => {});

router.get("/", verifyUser(), async (_req: Request, _res: Response) => {});

router.get("/:id", verifyUser(), async (_req: Request, _res: Response) => {});

router.patch("/:id", verifyUser(), async (_req: Request, _res: Response) => {});

router.delete(
  "/hard/:id",
  verifyUser(),
  async (_req: Request, _res: Response) => {}
);

router.delete(
  "/soft/:id",
  verifyUser(),
  async (_req: Request, _res: Response) => {}
);

export default router;
