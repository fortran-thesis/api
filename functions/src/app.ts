import auditLogRoutes from "./routes/auditLogRoutes";
import express, {Router, Request, Response, NextFunction} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import {corsOptions} from "./configs/cors";
import {setupSwagger} from "./configs/swagger";
import authRoutes from "./routes/authRoutes";

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
import curatorRoutes from "./routes/curatorRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import systemRequestRoutes from "./routes/systemRequestRoutes";
import testRoute from "./routes/testRoute";
import faqRoutes from "./routes/faqRoutes";
import flagReportRoutes from "./routes/flagReportRoutes";
import {cloudRunMultipartFix} from "./middlewares/cloudRunMultipartFix";

const app = express();

// CRITICAL: Capture raw body BEFORE any middleware for multipart forms in Cloud Run
// Cloud Run/Firebase Functions v2 consume the stream, so we need to buffer it first
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      (req as any).rawBody = Buffer.concat(chunks);
      console.log("[RAW BODY CAPTURE] Captured", (req as any).rawBody.length, "bytes");
      next();
    });
    req.on("error", (err) => {
      console.error("[RAW BODY CAPTURE] Error:", err);
      next(err);
    });
  } else {
    next();
  }
});

// CRITICAL: Parse multipart/form-data using the captured rawBody
// This MUST come after raw body capture but before any other middleware
app.use(cloudRunMultipartFix);

// Apply security headers early (but after multipart fix to avoid interfering with parsing)
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());

// Only parse JSON and URL-encoded bodies, skip multipart
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    // Skip body parsing for multipart - cloudRunMultipartFix already handled it
    console.log("[APP] Skipping body parser for multipart request");
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
router.use("/v1/curator", curatorRoutes);
router.use("/v1/admin", adminRoutes);
router.use("/v1/report", reportRoutes);
router.use("/v1/system-request", systemRequestRoutes);
router.use("/v1/audit-log", auditLogRoutes);
router.use("/v1/faq", faqRoutes);
router.use("/v1/flag-report", flagReportRoutes);
router.use("/v1/test", testRoute);

app.use("/api", router);

// Global error handler for multipart/multer errors
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error("Global Error Handler Caught:", err);
  console.log("Request Headers:", JSON.stringify(req.headers, null, 2));

  // Handle Multer/Busboy errors
  if (
    err.message === "Unexpected end of form" ||
    err.code === "UNEXPECTED_END_OF_FORM"
  ) {
    res.status(400).json({
      success: false,
      message:
        "Multipart form upload error: unexpected end of form. This may be due to network issues, incomplete upload, or timeout.",
      error: err.message,
      contentLength: req.headers["content-length"],
      contentType: req.headers["content-type"],
    });
    return;
  }

  // Handle other Multer errors
  if (err.name === "MulterError") {
    res.status(400).json({
      success: false,
      message: "File upload error",
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Generic error handler
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
});

export default app;
