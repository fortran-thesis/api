import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import { Role } from "../types/enums";
import {
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  patchUser,
} from "../controllers/userController";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  getUserById(req, res);
});

router.get("/:email", async (req: Request, res: Response) => {
  getUserByEmail(req, res);
});

router.get("/", verifyUser(Role.ADMIN), async (req: Request, res: Response) => {
  getAllUsers(req, res);
});

router.patch("/:id", async (req: Request, res: Response) => {
  patchUser(req, res);
});

router.delete(
  "/:id",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    deleteUser(req, res);
  }
);

export default router;
