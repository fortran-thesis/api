import {envOptions} from "./environment";

export const corsOptions = {
  origin: envOptions.isProd ?
    ["https://moldify.vercel.app"] :
    ["http://localhost:3000", "https://moldify.vercel.app"],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
