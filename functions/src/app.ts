import auditLogRoutes from "./routes/auditLogRoutes";
import express, {Router, Request, Response, NextFunction} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {rateLimit} from "express-rate-limit";
import {corsOptions} from "./configs/cors";
import {setupSwagger} from "./configs/swagger";
import authRoutes from "./routes/authRoutes";
import {devLog} from "./utils/dev";

import userRoutes from "./routes/userRoutes";
import mycologistRoutes from "./routes/mycologistRoutes";
import {limitingOptions} from "./configs/limit";
import helmet from "helmet";
import scanRoutes from "./routes/scannedMoldRoutes";
import monitorRoutes from "./routes/monitoredMoldRoutes";
import moldRoutes from "./routes/moldRoutes";
import moldipediaRoutes from "./routes/moldipediaRoutes";
import moldCaseRoutes from "./routes/moldCaseRoutes";
import moldReportRoutes from "./routes/moldReportRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import systemRequestRoutes from "./routes/systemRequestRoutes";
import testRoute from "./routes/testRoute";
import faqRoutes from "./routes/faqRoutes";
import flagReportRoutes from "./routes/flagReportRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import modelRoutes from "./routes/modelRoutes";
import {cloudRunMultipartFix} from "./middlewares/cloudRunMultipartFix";
import {globalErrorHandler} from "./middlewares/errorHandler";
import {httpLogger} from "./middlewares/httpLogger";

const app = express();

// Set timeout for large file uploads (9 minutes = 540 seconds, Cloud Run hard limit)
// This is the maximum time allowed for an entire HTTP request in Cloud Run
app.use((req, res, next) => {
  devLog(`[TIMEOUT] Setting socket timeout to 540s (9 min) for request to ${req.path}`);
  req.setTimeout(540000); // 9 minutes (Cloud Run hard limit)
  res.setTimeout(540000); // 9 minutes (Cloud Run hard limit)
  next();
});

// CRITICAL: Parse multipart/form-data using the captured rawBody or stream directly
// This MUST come before any other body parser

// HTTP request/response logging (structured JSON in prod, pretty in dev)
app.use(httpLogger);

// Capture raw body for multipart requests before any middleware consumes the stream.
// Firebase Functions provides rawBody automatically in production; this covers local dev.
app.use((req: Request, res: Response, next: NextFunction) => {
  const ct = req.headers["content-type"] ?? "";
  if (!ct.includes("multipart/form-data")) return next();
  if ((req as any).rawBody) return next(); // Already provided by Firebase Functions SDK
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", next);
});

app.use(cloudRunMultipartFix);

// Apply security headers early (but after multipart fix to avoid interfering with parsing)
app.use(helmet());
app.set("etag", false); // Disable Express auto-ETags — caching handled by Redis (server) and dio_cache_interceptor (mobile)
app.use(cors(corsOptions));
app.use(cookieParser());

// Only parse JSON and URL-encoded bodies, skip multipart
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    // Skip body parsing for multipart - cloudRunMultipartFix already handled it
    devLog("[APP] Skipping body parser for multipart request");
    return next();
  }
  // Apply JSON and URL-encoded parsers for other content types
  express.json({limit: "10mb"})(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({extended: true, limit: "10mb"})(req, res, next);
  });
});

app.use(rateLimit(limitingOptions));
setupSwagger(app);

const router = Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/user", userRoutes);
router.use("/v1/mycologist", mycologistRoutes);
router.use("/v1/mold", moldRoutes);
router.use("/v1/scan", scanRoutes);
router.use("/v1/monitor", monitorRoutes);
router.use("/v1/moldipedia", moldipediaRoutes);
router.use("/v1/mold-case", moldCaseRoutes);
router.use("/v1/mold-report", moldReportRoutes);
router.use("/v1/admin", adminRoutes);
router.use("/v1/report", reportRoutes);
router.use("/v1/system-request", systemRequestRoutes);
router.use("/v1/audit-log", auditLogRoutes);
router.use("/v1/faq", faqRoutes);
router.use("/v1/flag-report", flagReportRoutes);
router.use("/v1/notification", notificationRoutes);
router.use("/v1/model", modelRoutes);
router.use("/v1/test", testRoute);

app.use("/api", router);

app.use(globalErrorHandler);

export default app;
