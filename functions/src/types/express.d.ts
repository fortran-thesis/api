import {APIUser, WithId} from "../types/types";
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: WithId<APIUser>;
      /** Populated by cloudRunMultipartFix before any body parser runs. */
      rawBody?: Buffer;
      /**
       * Set by a controller after successfully creating a new resource so
       * the `auditLog` middleware can capture the new document's ID as the
       * audit target, rather than falling back to `req.params.id`.
       *
       * @example (inside a create controller)
       *   req.auditTargetId = newDoc.id;
       *   return sendSuccess(res, newDoc);
       */
      auditTargetId?: string;
    }
  }
}
