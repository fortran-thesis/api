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
  apis: [
    process.env.NODE_ENV === "production" 
      ? "./lib/controllers/*.js" 
      : "./src/controllers/*.ts"
  ], // Path to your API files
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Determines if the application is running in Firebase emulators
 */
function isRunningInEmulator(): boolean {
  return !!(process.env.FUNCTIONS_EMULATOR ||
           envOptions.firebaseAuthEmulatorHost ||
           envOptions.firestoreEmulatorHost);
}

export const setupSwagger = (app: Express) => {
  // Swagger UI options to disable "Try it out" for security
  const swaggerUiOptions = {
    swaggerOptions: {
      supportedSubmitMethods: [], // Disable all "Try it out" buttons
    },
  };

  if (isRunningInEmulator()) {
    // In Firebase emulator, use default swagger-ui-express behavior
    // This lets swagger-ui-express handle the spec serving automatically
    app.use("/api-docs", swaggerUi.serve);
    app.get("/api-docs", swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  } else {
    // In local development, use the custom URL configuration
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  }
};
