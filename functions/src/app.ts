import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { corsOptions } from "./configs/cors";
import { setupSwagger } from "./configs/swagger";
import authRoutes from "./routes/authRoutes";
import { Router } from "express";
import userRoutes from "./routes/userRoutes";
import { limitingOptions } from "./configs/limit";
import helmet from "helmet";

const app = express();
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(rateLimit(limitingOptions));
setupSwagger(app);

const router = Router();
router.use("/v1/auth", authRoutes);
router.use("/v1/user", userRoutes);

app.use("/api", router);

export default app;
