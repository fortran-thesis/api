import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import {Express} from "express";
import {envOptions} from "./environment";
import {swaggerSchemas} from "./swaggerSchemas";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "Auto-generated API docs using Swagger",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "session",
        },
      },
      schemas: swaggerSchemas,
    },
  },
  apis: process.env.NODE_ENV === "production" ?
    ["./lib/swagger/*.js", "./lib/controllers/*.js"] :
    ["./src/swagger/*.ts", "./src/controllers/*.ts"],
  // Path to your API files
};

export const swaggerSpec = swaggerJsdoc(options);

type SwaggerSchema = {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SwaggerSchema>;
  items?: SwaggerSchema;
  allOf?: SwaggerSchema[];
  oneOf?: SwaggerSchema[];
  anyOf?: SwaggerSchema[];
  [key: string]: unknown;
};

const MULTIPART_JSON_NOTE = "Documentation view: this JSON shows the form-data " +
  "shape. When calling this endpoint as multipart/form-data, send files as " +
  "binary fields and stringify object/array values when needed.";
const MULTIPART_STRINGIFIED_NOTE = "Send this value as a JSON string in multipart/form-data.";

const cloneSchema = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const appendDescriptionNote = (description: string | undefined, note: string): string => {
  if (!description) return note;
  if (description.includes(note)) return description;
  return `${description} ${note}`;
};

const toMultipartStringSchema = (schema: SwaggerSchema): SwaggerSchema => {
  const next = cloneSchema(schema);
  const nextExample = next.example !== undefined ?
    next.example :
    next.default;
  const stringifiedExample = nextExample !== undefined ?
    JSON.stringify(nextExample) :
    JSON.stringify({});

  return {
    type: "string",
    description: appendDescriptionNote(next.description, MULTIPART_STRINGIFIED_NOTE),
    example: stringifiedExample,
  };
};

const normalizeMultipartSchemaForFormDataView = (schema?: SwaggerSchema): SwaggerSchema | undefined => {
  if (!schema) return undefined;

  const next = cloneSchema(schema);

  if (next.type === "string" && next.format === "binary") {
    return next;
  }

  if (next.type === "object") {
    if (!next.properties || Object.keys(next.properties).length === 0) {
      return toMultipartStringSchema(next);
    }

    for (const key of Object.keys(next.properties)) {
      const property = next.properties[key];
      if (property?.type === "string" && property?.format === "binary") {
        continue;
      }

      if (property?.type === "object" || property?.type === "array") {
        next.properties[key] = toMultipartStringSchema(property);
        continue;
      }

      next.properties[key] = normalizeMultipartSchemaForFormDataView(property) as SwaggerSchema;
    }

    return next;
  }

  if (next.type === "array") {
    return toMultipartStringSchema(next);
  }

  return next;
};

const normalizeMultipartSchemaForJsonView = (schema?: SwaggerSchema): SwaggerSchema | undefined => {
  if (!schema) return undefined;

  const next = cloneSchema(schema);

  if (next.type === "string" && next.format === "binary") {
    const descriptionPrefix = next.description ?
      `${next.description} ` :
      "";
    next.format = undefined;
    next.example = "<file>";
    next.description = `${descriptionPrefix}(JSON docs view only) Use a file in multipart/form-data.`;
  }

  if (next.properties) {
    for (const key of Object.keys(next.properties)) {
      next.properties[key] = normalizeMultipartSchemaForJsonView(next.properties[key]) as SwaggerSchema;
    }
  }

  if (next.items) {
    next.items = normalizeMultipartSchemaForJsonView(next.items) as SwaggerSchema;
  }

  if (Array.isArray(next.allOf)) {
    next.allOf = next.allOf
      .map((part) => normalizeMultipartSchemaForJsonView(part) as SwaggerSchema);
  }

  if (Array.isArray(next.oneOf)) {
    next.oneOf = next.oneOf
      .map((part) => normalizeMultipartSchemaForJsonView(part) as SwaggerSchema);
  }

  if (Array.isArray(next.anyOf)) {
    next.anyOf = next.anyOf
      .map((part) => normalizeMultipartSchemaForJsonView(part) as SwaggerSchema);
  }

  return next;
};

const addJsonViewForMultipartRequestBodies = () => {
  const paths = (swaggerSpec as any)?.paths;
  if (!paths || typeof paths !== "object") return;

  for (const pathItem of Object.values(paths) as Record<string, any>[]) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const operation of Object.values(pathItem) as Record<string, any>[]) {
      if (!operation || typeof operation !== "object") continue;

      const content = operation?.requestBody?.content;
      if (!content || typeof content !== "object") continue;

      const multipart = content["multipart/form-data"];
      if (!multipart || typeof multipart !== "object") continue;

      const originalMultipartSchema = cloneSchema(multipart.schema);
      const normalizedSchema = normalizeMultipartSchemaForJsonView(originalMultipartSchema);
      const formDataSchema = normalizeMultipartSchemaForFormDataView(originalMultipartSchema);

      if (formDataSchema) {
        multipart.schema = formDataSchema;
      }

      if (normalizedSchema) {
        content["application/json"] = {
          schema: normalizedSchema,
          description: MULTIPART_JSON_NOTE,
        };
      }

      if (!multipart.description) {
        multipart.description = MULTIPART_JSON_NOTE;
      }
    }
  }
};

addJsonViewForMultipartRequestBodies();

/**
 * Determines if the application is running in Firebase emulators
 */
function isRunningInEmulator(): boolean {
  return !!(process.env.FUNCTIONS_EMULATOR ||
           envOptions.firebaseAuthEmulatorHost ||
           envOptions.firestoreEmulatorHost);
}

/**
 * Setup Swagger UI documentation
 * @param {Express} app - Express application instance
 */
export const setupSwagger = (app: Express) => {
  // Swagger UI options to disable "Try it out" for security
  const swaggerUiOptions = {
    swaggerOptions: {
      supportedSubmitMethods: [], // Disable all "Try it out" buttons
    },
  };

  if (isRunningInEmulator()) {
    // In Firebase emulator, use default swagger-ui-express behavior
    // This lets swagger-ui-express handle the spec serving
    // automatically
    app.use("/api-docs", swaggerUi.serve);
    app.get("/api-docs", swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  } else {
    // In local development, use the custom URL configuration
    app.use("/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  }
};
