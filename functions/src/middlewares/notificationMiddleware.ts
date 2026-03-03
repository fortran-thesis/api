/**
 * Notification Middleware — declarative, route-level notification factory.
 *
 * Mirrors the `auditLog` middleware pattern from `auditLogger.ts`:
 *   • Placed in the route pipeline BEFORE the controller.
 *   • Hooks into `res.on("finish")` so the notification write happens
 *     AFTER the response is sent — never delaying the HTTP response.
 *   • Only fires on 2xx responses.
 *   • Errors are caught and logged, never propagated.
 *
 * ## Response body interception
 *
 * Since `res.on("finish")` fires after the body has been sent, the
 * middleware monkey-patches `res.json()` to stash the serialised response
 * on `req._notificationResBody`.  This gives `recipientsFn` and
 * `contextFn` access to the resource that was just created / updated.
 *
 * @example
 * // Single recipient — notify the farmer when a report is rejected
 * router.patch("/:id/reject",
 *   verifyUser(Role.ADMIN),
 *   notify({
 *     type: NotificationType.MOLD_REPORT_REJECTED,
 *     recipientsFn: (_req, body) => [
 *       { recipientId: body?.data?.user_id },
 *     ],
 *     referenceType: "mold_report",
 *     contextFn: (_req, body) => ({ case_name: body?.data?.case_name }),
 *   }),
 *   async (req, res) => { await rejectReport(req, res); }
 * );
 *
 * @example
 * // Multi-recipient — assign notifies farmer AND mycologist
 * router.patch("/:id/assign",
 *   verifyUser(Role.ADMIN),
 *   notify({
 *     type: NotificationType.MOLD_REPORT_ASSIGNED,
 *     recipientsFn: (req, body) => [
 *       { recipientId: body?.data?.user_id, extraContext: { role: "farmer" } },
 *       { recipientId: req.body.assigned_mycologist_id, extraContext: { role: "mycologist" } },
 *     ],
 *     referenceType: "mold_report",
 *     contextFn: (_req, body) => ({ case_name: body?.data?.case_name }),
 *   }),
 *   async (req, res) => { await assignReport(req, res); }
 * );
 */
import {Request, Response, NextFunction} from "express";
import {
  NotificationType,
  NotificationReferenceType,
  NotificationContext,
  NotificationRecipient,
} from "../types/types";
import {createBatchNotifications} from "../services/notificationService";
import {devLog} from "../utils/dev";

// ── Config types ─────────────────────────────────────────────────────────────

/**
 * Describes what notification(s) to create when a route responds successfully.
 */
export interface NotifyConfig {
  /** Default notification type for all recipients (can be overridden per-recipient). */
  type: NotificationType;
  /**
   * Resolves the list of recipients from the request and response body.
   * Return an empty array to skip notification for this request.
   */
  recipientsFn: (req: Request, resBody: any) => NotificationRecipient[];
  /** Resolves the reference ID (defaults to `req.params.id`). */
  referenceIdFn?: (req: Request, resBody: any) => string | null;
  /** The type of resource the `reference_id` points to. */
  referenceType?: NotificationReferenceType;
  /** Resolves template context variables (merged with per-recipient extras). */
  contextFn?: (req: Request, resBody: any) => NotificationContext;
}

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Route-level notification middleware factory.
 *
 * Accepts a single config or an array of configs (for routes that produce
 * multiple independent notification events).
 *
 * @param configs - One or more `NotifyConfig` objects.
 * @returns Express middleware function.
 */
export const notify = (configs: NotifyConfig | NotifyConfig[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // ── Intercept res.json() to capture the response body ──────────────
    const originalJson = res.json.bind(res);
    res.json = function interceptedJson(body: any): Response {
      req._notificationResBody = body;
      return originalJson(body);
    };

    // ── Post-response hook (same as auditLog) ──────────────────────────
    res.on("finish", async () => {
      try {
        // Only notify on successful responses.
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        const resBody = req._notificationResBody as any;
        const configArr = Array.isArray(configs) ? configs : [configs];

        for (const config of configArr) {
          const recipients = config.recipientsFn(req, resBody);
          if (!recipients.length) continue;

          // Filter out recipients with falsy IDs (safety net)
          const validRecipients = recipients.filter(
            (r) => r.recipientId && typeof r.recipientId === "string"
          );
          if (!validRecipients.length) continue;

          const context = config.contextFn?.(req, resBody) ?? {};
          const referenceId =
            config.referenceIdFn?.(req, resBody) ??
            req.params.id ??
            null;

          await createBatchNotifications(
            validRecipients,
            config.type,
            context,
            referenceId,
            config.referenceType ?? null
          );
        }
      } catch (err) {
        devLog(err, "notify middleware");
      }
    });

    next();
  };
