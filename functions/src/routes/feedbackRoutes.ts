import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";

const router = Router();

router.post("/", verifyUser(), async (req: Request, res: Response) => {});

router.get("/", verifyUser(), async (req: Request, res: Response) => {});

router.get("/:id", verifyUser(), async (req: Request, res: Response) => {});

router.patch("/:id", verifyUser(), async (req: Request, res: Response) => {});

router.delete(
  "/hard/:id",
  verifyUser(),
  async (req: Request, res: Response) => {}
);

router.delete(
  "/soft/:id",
  verifyUser(),
  async (req: Request, res: Response) => {}
);

export default router;
