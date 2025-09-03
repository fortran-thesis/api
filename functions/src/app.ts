import auditLogRoutes from "./routes/auditLogRoutes";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { corsOptions } from "./configs/cors";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/authRoutes";
import { Router } from "express";
import userRoutes from "./routes/userRoutes";
import { limitingOptions } from "./configs/limit";
import helmet from "helmet";
import scanRoutes from "./routes/scannedMoldRoutes";
import monitorRoutes from "./routes/monitoredMoldRoutes";
import moldRoutes from "./routes/moldRoutes";
import moldipediaRoutes from "./routes/moldipediaRoutes";
import moldFolderRoutes from "./routes/moldFolderRoutes";
import curatorRoutes from "./routes/curatorRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import systemRequestRoutes from "./routes/systemRequestRoutes";
import testRoute from "./routes/testRoute";
import { swaggerSpec } from "./configs/swagger";

const app = express();
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(rateLimit(limitingOptions));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {swaggerOptions: {
      url: "/thesis-2e701/asia-southeast1/api/api-docs/swagger.json", // full path to your spec
    }}));

const router = Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/user", userRoutes);
router.use("/v1/mold", moldRoutes);
router.use("/v1/scan", scanRoutes);
router.use("/v1/monitor", monitorRoutes);
router.use("/v1/moldipedia", moldipediaRoutes);
router.use("/v1/mold-folder", moldFolderRoutes);
router.use("/v1/curator", curatorRoutes);
router.use("/v1/admin", adminRoutes);
router.use("/v1/report", reportRoutes);
router.use("/v1/system-request", systemRequestRoutes);
router.use("/v1/audit-log", auditLogRoutes);
router.use("/v1/test", testRoute);

app.use("/api", router);

export default app;
