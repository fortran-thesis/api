import {envOptions} from "./environment";

export const corsOptions = {
  // Allow browser origins from the configured list, and also allow requests
  // without an `Origin` header (e.g. Postman desktop/CLI). This keeps
  // browser restrictions intact while permitting Postman testing.
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowed = envOptions.isProd
      ? ["https://moldify1987-4159580.postman.co", "https://moldify.vercel.app"]
      : ["http://localhost:3000", "https://moldify1987-4159580.postman.co", "https://moldify.vercel.app"];

    // No Origin header (Postman desktop, curl, server-to-server) — allow
    if (!origin) return callback(null, true);

    // Normalize incoming origin and allowed list entries by stripping trailing slash
    const normalize = (u: string) => u.replace(/\/$/, "");
    const normalizedOrigin = normalize(origin);

    if (allowed.map(normalize).includes(normalizedOrigin)) return callback(null, true);

    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept", "X-Requested-With", "Postman-Token"],
};
