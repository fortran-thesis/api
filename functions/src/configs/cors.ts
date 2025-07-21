import { envOptions } from "./environment";

export const corsOptions = {
  origin: envOptions.isProd ? [""] : ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
