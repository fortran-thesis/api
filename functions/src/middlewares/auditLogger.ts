import {Request, Response, NextFunction} from "express";
import {AuditAction} from "../types/enums";
import {createLog} from "../utils/logging";
import {devLog} from "../utils/dev";

type DescriptionFn = (req: Request) => string;
type TargetIdFn = (req: Request) => string;

/**
 * Route-level audit logging middleware factory.
 *
 * Place this BEFORE the controller on any route that should produce an audit
 * log entry. The log write happens inside `res.on("finish")`, which means it
 * fires after the controller has already sent its response — the audit write
 * never delays the HTTP response.
 *
 * ## Target ID resolution (in priority order)
 *  1. `req.auditTargetId`  — set by the controller for newly-created docs
 *  2. `targetIdFn(req)`    — custom resolver supplied to this factory
 *  3. `req.params.id`      — default suitable for most update / delete routes
 *  4. `"unknown"`          — safe final fallback
 *
 * ## When does the log fire?
 *  - Only when the response status is **2xx** (success).
 *  - Only when `req.user` is populated (authenticated request).
 *
 * @param action      - The `AuditAction` enum value to record.
 * @param description - Static string or `(req) => string` factory describing the event.
 * @param targetIdFn  - Optional custom resolver for the target document ID.
 *
 * @example
 * // Update route — target comes from req.params.id (default)
 * router.patch("/:id",
 *   verifyUser(),
 *   auditLog(AuditAction.EDIT_MOLD, (req) => `Updated mold ${req.params.id}`),
 *   async (req, res) => { await patchMold(req, res); }
 * );
 *
 * @example
 * // Create route — controller sets req.auditTargetId = newDoc.id
 * router.post("/",
 *   verifyUser(),
 *   auditLog(AuditAction.ADD_MOLD, "Created mold"),
 *   async (req, res) => { await createMold(req, res); }
 * );
 *
 * @example
 * // Admin route where target ID lives in request body
 * router.post("/disable-user",
 *   verifyUser(Role.ADMIN),
 *   auditLog(AuditAction.DISABLE_USER, "Disabled user", (req) => req.body.id),
 *   async (req, res) => { await disableUser(req, res); }
 * );
 */
export const auditLog = (
  action: AuditAction,
  description?: string | DescriptionFn,
  targetIdFn?: TargetIdFn
) =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      try {
        // Only audit authenticated, successful responses.
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        if (!req.user) return;

        const {id, user: {role}} = req.user;

        const targetId: string =
          req.auditTargetId ??
          (targetIdFn ? targetIdFn(req) : undefined) ??
          req.params.id ??
          "unknown";

        const desc: string =
          typeof description === "function" ?
            description(req) :
            (description ?? `${action} on ${targetId}`);

        // Fire-and-forget — audit log failures must never affect the response.
        createLog(id, role, action, desc, targetId);
      } catch (err) {
        devLog(err, "auditLog middleware");
      }
    });
    next();
  };
