import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./configs/cors";
import { setupSwagger } from "./configs/swagger";
import authRoutes from "./routes/authRoutes";
import { Router } from "express";
import userRoutes from "./routes/userRoutes";

const app = express();
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
setupSwagger(app);


const router = Router();
router.use("/v1/auth", authRoutes);
router.use("/v1/user", userRoutes);

app.use("/api", router);

export default app;
