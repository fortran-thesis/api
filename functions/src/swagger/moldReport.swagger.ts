/**
  * @swagger
  * /api/v1/mold-report:
  *   post:
  *     summary: Create a new mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Create a new mold report. Requires authentication.
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             required:
  *               - case_name
  *               - host
  *               - location
  *               - date_observed
  *               - description
  *             properties:
  *               case_name:
  *                 type: string
  *               host:
  *                 type: string
  *                 description: Crop or surface name (e.g., "rice", "drywall").
  *               location:
  *                 type: string
  *                 description: City/province where mold was observed.
  *               date_observed:
  *                 type: string
  *                 format: date-time
  *                 description: ISO 8601 string. Converted to Firestore Timestamp.
  *               description:
  *                 type: string
  *               reported_symptoms:
  *                 type: array
  *                 items:
  *                   type: string
  *                 description: Used for background mold lookup. Saved synchronously to Firestore, then lookup runs asynchronously and writes `lookup_results` to the report.
  *               reported_signs:
  *                 type: array
  *                 items:
  *                   type: string
  *               reported_characteristics:
  *                 type: array
  *                 items:
  *                   type: string
  *               cover_photo:
  *                 type: string
  *                 format: binary
  *                 description: Optional. Uploaded asynchronously after the report document is created. The URL is written to the first case_detail subcollection document when the upload completes.
  *     responses:
  *       200:
  *         description: Mold report created. `case_details` in the response is the array provided in the request body — it is not stored in the parent Firestore document. Subsequent GETs hydrate `case_details` from the `mold_reports/{id}/case_details` subcollection. Photo upload (if any) runs in the background; the URL is not yet present in the response.
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     case_name:
  *                       type: string
  *                     date_observed:
  *                       type: string
  *                       format: date-time
  *                     user_id:
  *                       type: string
  *                     assigned_mycologist_id:
  *                       type: string
  *                       nullable: true
  *                     host:
  *                       type: string
  *                     location:
  *                       type: string
  *                     status:
  *                       type: string
  *                       enum: [pending, "in progress", resolved, rejected]
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                       nullable: true
  *                     reviewed_mycologist_id:
  *                       type: string
  *                       nullable: true
  *                     reviewed_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
  *                     reported_symptoms:
  *                       type: array
  *                       items:
  *                         type: string
  *                       nullable: true
  *                     reported_signs:
  *                       type: array
  *                       items:
  *                         type: string
  *                       nullable: true
  *                     reported_characteristics:
  *                       type: array
  *                       items:
  *                         type: string
  *                       nullable: true
  *                     rejection_reason:
  *                       type: string
  *                       nullable: true
  *                     case_details:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           description:
  *                             type: string
  *                           cover_photo:
  *                             type: array
  *                             items:
  *                               type: string
  *       x-side-effects:
  *         - If `reported_symptoms`, `reported_signs`, or `reported_characteristics` are non-empty, a keyword-based mold lookup runs in the background and writes `lookup_results` to the report document. The response will not contain `lookup_results`.
  *       400:
  *         description: Validation error - Missing or invalid required fields (case_name, host, location, date_observed, description)
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/counts/statuses:
  *   get:
  *     summary: Get mold report status counts
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve counts of mold reports by status (pending, in progress, resolved, rejected). Admins see all reports, farmers and mycologists see only their own.
  *     responses:
  *       200:
  *         description: Status counts retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     total:
  *                       type: integer
  *                       description: Total number of reports
  *                     pending:
  *                       type: integer
  *                       description: Number of pending reports
  *                     in_progress:
  *                       type: integer
  *                       description: Number of in-progress reports
  *                     resolved:
  *                       type: integer
  *                       description: Number of resolved reports
  *                     closed:
  *                       type: integer
  *                       description: Number of closed/rejected reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/public/resolved-count:
  *   get:
  *     summary: Get count of resolved mold reports
  *     tags: [MoldReport]
  *     description: Retrieve the count of all resolved mold reports. Public endpoint - no authentication required.
  *     responses:
  *       200:
  *         description: Resolved count retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                 data:
  *                   type: object
  *                   properties:
  *                     resolved_count:
  *                       type: integer
  *                       description: Number of resolved mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report:
  *   get:
  *     summary: Get all mold reports
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all mold reports with pagination. Requires authentication.
  *     parameters:
  *       - in: query
  *         name: scope
  *         schema:
  *           type: string
  *           enum: [own, assigned, all]
  *         description: Controls which reports are returned. `own` returns reports created by the authenticated user (default for farmers). `assigned` returns reports assigned to the authenticated mycologist (default for curators). `all` returns all reports (admin only; returns 403 for non-admin). If omitted, defaults based on the caller's role.
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of mold reports
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                             format: date-time
  *                           user_id:
  *                             type: string
  *                           assigned_mycologist_id:
  *                             type: string
  *                             nullable: true
  *                           host:
  *                             type: string
  *                           location:
  *                             type: string
  *                           status:
  *                             type: string
  *                             enum: [pending, "in progress", resolved, rejected]
  *                           priority:
  *                             type: string
  *                             enum: [low, medium, high]
  *                             nullable: true
  *                           reviewed_mycologist_id:
  *                             type: string
  *                             nullable: true
  *                             description: ID of the mycologist who reviewed this report
  *                           reviewed_at:
  *                             type: string
  *                             format: date-time
  *                             nullable: true
  *                             description: Timestamp when the report was reviewed
  *                           reported_symptoms:
  *                             type: array
  *                             items:
  *                               type: string
  *                             nullable: true
  *                             description: Symptoms reported by the user
  *                           reported_signs:
  *                             type: array
  *                             items:
  *                               type: string
  *                             nullable: true
  *                             description: Signs reported by the user
  *                           reported_characteristics:
  *                             type: array
  *                             items:
  *                               type: string
  *                             nullable: true
  *                             description: Characteristics reported by the user
  *                           lookup_results:
  *                             type: array
  *                             nullable: true
  *                             description: Results from background mold lookup. May be updated asynchronously after report creation.
  *                             items:
  *                               type: object
  *                               properties:
  *                                 moldId:
  *                                   type: string
  *                                 moldName:
  *                                   type: string
  *                                 confidence:
  *                                   type: number
  *                                 timestamp:
  *                                   type: string
  *                                   format: date-time
  *                                   nullable: true
  *                           rejection_reason:
  *                             type: string
  *                             nullable: true
  *                             description: Reason for rejection if status is rejected
  *                           case_details:
  *                             type: array
  *                             nullable: true
  *                             items:
  *                               type: object
  *                               properties:
  *                                 description:
  *                                   type: string
  *                                 cover_photo:
  *                                   type: array
  *                                   items:
  *                                     type: string
  *                           reporter:
  *                             type: object
  *                             properties:
  *                               id:
  *                                 type: string
  *                               name:
  *                                 type: string
  *                           metadata:
  *                             type: object
  *                             properties:
  *                               created_at:
  *                                 type: string
  *                                 format: date-time
  *                               updated_at:
  *                                 type: string
  *                                 format: date-time
  *                                 nullable: true
  *                               deleted_at:
  *                                 type: string
  *                                 format: date-time
  *                                 nullable: true
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *                       description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
  *       403:
  *         description: Non-admin caller requested `scope=all`.
  *       404:
  *         description: Failed to retrieve mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/user:
  *   get:
  *     summary: Get all mold reports by authenticated user
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all mold reports created by the authenticated user with pagination. Requires authentication.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of user's mold reports
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                             format: date-time
  *                           assigned_mycologist_id:
  *                             type: string
  *                             nullable: true
  *                           host:
  *                             type: string
  *                           location:
  *                             type: string
  *                           status:
  *                             type: string
  *                             enum: [pending, "in progress", resolved, rejected]
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
  *       404:
  *         description: Failed to retrieve mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/user/closed:
  *   get:
  *     summary: Get authenticated user's closed mold reports
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve closed (archived/rejected) mold reports for the authenticated user with pagination. Requires authentication.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of user's closed mold reports
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                             format: date-time
  *                           assigned_mycologist_id:
  *                             type: string
  *                             nullable: true
  *                           host:
  *                             type: string
  *                           location:
  *                             type: string
  *                           status:
  *                             type: string
  *                             enum: [closed, rejected]
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
  *       404:
  *         description: Failed to retrieve mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/closed:
  *   get:
  *     summary: Get all closed mold reports
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all closed mold reports (including rejected) with pagination. Requires authentication.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of closed mold reports
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                           status:
  *                             type: string
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
  *       404:
  *         description: Failed to retrieve mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/aggregate/closed:
  *   get:
  *     summary: Get aggregated closed mold reports (future implementation)
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all closed mold reports with aggregated statistics. Requires admin role. Used for dashboard boxes and analytics.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of closed mold reports with aggregate data
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
  *       404:
  *         description: Failed to retrieve mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/aggregate/rejected:
  *   get:
  *     summary: Get aggregated rejected mold reports (future implementation)
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all rejected mold reports with aggregated statistics. Requires admin role. Used for dashboard boxes and analytics.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of rejected mold reports with aggregate data
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
  *       404:
  *         description: Failed to retrieve mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/unassigned:
  *   get:
  *     summary: Get unassigned mold reports
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all mold reports that have not been assigned to a mycologist. Requires admin role.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of unassigned mold reports
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                           status:
  *                             type: string
  *                             enum: [pending]
  *                           assigned_mycologist_id:
  *                             type: string
  *                             nullable: true
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       404:
  *         description: Failed to retrieve unassigned mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/{id}/case-details:
  *   post:
  *     summary: Add case detail to a mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Add a case detail (follow-up) to an existing mold report. If the requester is the report owner, the report status resets to pending and the mycologist is unassigned. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - description
  *             properties:
  *               cover_photo:
  *                 type: array
  *                 items:
  *                   type: string
  *                 description: Array of photo URLs (optional)
  *               description:
  *                 type: string
  *                 description: Case detail description
  *     responses:
  *       200:
  *         description: Case detail added successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   description: The newly created case detail document
  *                   properties:
  *                     id:
  *                       type: string
  *                       description: Subcollection document ID
  *                     cover_photo:
  *                       type: array
  *                       items:
  *                         type: string
  *                     description:
  *                       type: string
  *                     timestamp:
  *                       type: string
  *                       format: date-time
  *       400:
  *         description: Failed to add case detail
  *       401:
  *         description: Unauthorized
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Report not found
  *       409:
  *         description: Cannot add follow-up in the report's current status
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/{id}/assign:
  *   patch:
  *     summary: Assign a mycologist to a mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Assign a mycologist to a mold report and optionally update its status. Requires admin role.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - assigned_mycologist_id
  *             properties:
  *               assigned_mycologist_id:
  *                 type: string
  *                 description: ID of the mycologist to assign
  *               end_date:
  *                 type: string
  *                 format: date-time
  *                 description: Optional expected end date. Written to the auto-created MoldCase document.
  *     responses:
  *       200:
  *         description: Mycologist assigned. Status set to `in progress`. A MoldCase is automatically created (or repaired if one already exists) and linked to this report. The response is the full updated report including enriched `reporter` object and `priority` from the linked MoldCase.
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     case_name:
  *                       type: string
  *                     date_observed:
  *                       type: string
  *                       format: date
  *                     user_id:
  *                       type: string
  *                     assigned_mycologist_id:
  *                       type: string
  *                     reporter:
  *                       type: object
  *                       properties:
  *                         id:
  *                           type: string
  *                         name:
  *                           type: string
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                       nullable: true
  *                     host:
  *                       type: string
  *                     location:
  *                       type: string
  *                     status:
  *                       type: string
  *                       enum: [pending, in progress, resolved, rejected, closed]
  *                     case_details:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                             description: Subcollection document ID
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *       400:
  *         description: Failed to assign mycologist
  *       409:
  *         description: Report is already assigned to a mycologist, or the current status does not allow transition to `in progress` (e.g., status is `resolved` or `rejected`).
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/{id}/reject:
  *   patch:
  *     summary: Reject/close a mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Mark a mold report as rejected and clear assigned mycologist. Requires admin role.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - rejection_reason
  *             properties:
  *               rejection_reason:
  *                 type: string
  *                 minLength: 1
  *                 description: Reason for rejection. Stored on the report and included in the notification sent to the report owner.
  *     responses:
  *       200:
  *         description: Report rejected successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     case_name:
  *                       type: string
  *                     date_observed:
  *                       type: string
  *                       format: date
  *                     user_id:
  *                       type: string
  *                     assigned_mycologist_id:
  *                       type: string
  *                       nullable: true
  *                     host:
  *                       type: string
  *                     location:
  *                       type: string
  *                     status:
  *                       type: string
  *                       enum: [rejected]
  *                     case_details:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                             description: Subcollection document ID
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *       400:
  *         description: Failed to reject/close report
  *       409:
  *         description: Current report status does not permit a transition to `rejected`. Only `pending` and `in progress` reports can be rejected.
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/{id}/review:
  *   patch:
  *     summary: Mark a mold report as reviewed by the authenticated mycologist
  *     tags: [MoldReport]
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Records the mycologist who reviewed the report and the review timestamp.
  */

/**
  * @swagger
  * /api/v1/mold-report/assigned:
  *   get:
  *     summary: Get mold reports assigned to authenticated mycologist
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all mold reports assigned to the authenticated mycologist. Requires curator role.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of assigned mold reports
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                             format: date
  *                           user_id:
  *                             type: string
  *                           assigned_mycologist_id:
  *                             type: string
  *                           host:
  *                             type: string
  *                           location:
  *                             type: string
  *                           status:
  *                             type: string
  *                             enum: [in progress, resolved]
  *                           created_at:
  *                             type: string
  *                             format: date-time
  *                           updated_at:
  *                             type: string
  *                             format: date-time
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
  *       404:
  *         description: Failed to retrieve assigned mold reports
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/assigned/count:
  *   get:
  *     summary: Get count of reports assigned to a specific mycologist
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve the count of mold reports assigned to a specific mycologist by ID. Requires admin role.
  *     parameters:
  *       - in: query
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mycologist user ID
  *     responses:
  *       200:
  *         description: Count retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     total:
  *                       type: number
  *       400:
  *         description: Missing mycologist id
  *       500:
  *         description: Failed to retrieve count
  */

/**
  * @swagger
  * /api/v1/mold-report/{id}:
  *   get:
  *     summary: Get a mold report by ID
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve a specific mold report by its ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     responses:
  *       200:
  *         description: Mold report retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     case_name:
  *                       type: string
  *                     date_observed:
  *                       type: string
  *                       format: date
  *                     user_id:
  *                       type: string
  *                     assigned_mycologist_id:
  *                       type: string
  *                       nullable: true
  *                     host:
  *                       type: string
  *                     location:
  *                       type: string
  *                     status:
  *                       type: string
  *                       enum: [pending, in progress, resolved, rejected, closed]
  *                     case_details:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                             description: Subcollection document ID
  *                           cover_photo:
  *                             type: array
  *                             items:
  *                               type: string
  *                           description:
  *                             type: string
  *                           timestamp:
  *                             type: string
  *                             format: date-time
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Failed to retrieve mold report
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/{id}:
  *   patch:
  *     summary: Update a mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Updates editable fields on a mold report.
  *       Two fields are explicitly blocked:
  *       - `assigned_mycologist_id` — use `PATCH /:id/assign` instead (returns 400).
  *       - Status transitions to `in progress` or `rejected` — use `/:id/assign` or `/:id/reject` respectively (returns 400).
  *       Only the `resolved` status transition is permitted through this endpoint (from `in progress`).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             description: Partial mold report data to update
  *     responses:
  *       200:
  *         description: Mold report updated successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     case_name:
  *                       type: string
  *                     date_observed:
  *                       type: string
  *                       format: date
  *                     user_id:
  *                       type: string
  *                     assigned_mycologist_id:
  *                       type: string
  *                       nullable: true
  *                     host:
  *                       type: string
  *                     location:
  *                       type: string
  *                     status:
  *                       type: string
  *                       enum: [pending, in progress, resolved, rejected, closed]
  *                     case_details:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                             description: Subcollection document ID
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *       404:
  *         description: Failed to update mold report
  *       409:
  *         description: "Invalid status transition. The requested status cannot follow the current report status per the allowed transition rules."
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/hard/{id}:
  *   delete:
  *     summary: Hard delete a mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Permanently delete a mold report by ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     responses:
  *       200:
  *         description: Mold report deleted successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: string
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold report not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/soft/{id}:
  *   delete:
  *     summary: Close a mold report
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Close a mold report by setting its status to closed. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     responses:
  *       200:
  *         description: Mold report closed successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: string
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold report not found
  *       409:
  *         description: Invalid status transition for close operation
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-report/search:
  *   get:
  *     summary: Search and filter mold reports
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Search and filter mold reports. When the caller is a mycologist (curator role), results are always filtered to reports assigned to that mycologist, regardless of the `scope` parameter. Admins see all reports. Farmers see only their own reports.
  *
  *       Note: when `priority` is specified, a lookup against the `mold_cases` collection is performed first to find matching report IDs. If no cases match the priority, an empty result is returned immediately without querying reports.
  *     parameters:
  *       - in: query
  *         name: search
  *         schema:
  *           type: string
  *         description: Search term for case name, host, location, reporter name, or status (ignored when priority is set)
  *       - in: query
  *         name: status
  *         schema:
  *           type: string
  *           enum: [pending, "in progress", resolved, rejected]
  *         description: Filter by report status
  *       - in: query
  *         name: priority
  *         schema:
  *           type: string
  *           enum: [low, medium, high]
  *         description: Filter by mold case priority (searches mold_cases collection)
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *           default: 10
  *         description: Number of items per page
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: Filtered and searched mold report list
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           case_name:
  *                             type: string
  *                           date_observed:
  *                             type: string
  *                             format: date-time
  *                           host:
  *                             type: string
  *                           location:
  *                             type: string
  *                           status:
  *                             type: string
  *                           reporter:
  *                             type: object
  *                             properties:
  *                               id:
  *                                 type: string
  *                               name:
  *                                 type: string
  *                           mold_case:
  *                             type: object
  *                             properties:
  *                               priority:
  *                                 type: string
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       400:
  *         description: Invalid query parameters
  *       500:
  *         description: Failed to retrieve mold reports
  */

/**
  * @swagger
  * /api/v1/mold-report/counts/monthly:
  *   get:
  *     summary: Get monthly mold report totals for a year
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve mold report counts for all 12 months of a given year (defaults to current year). Requires authentication.
  *     parameters:
  *       - in: query
  *         name: year
  *         schema:
  *           type: integer
  *         description: Year to retrieve (defaults to current year)
  *     responses:
  *       200:
  *         description: Monthly totals retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: array
  *                   items:
  *                     type: object
  *                     properties:
  *                       month:
  *                         type: string
  *                         example: "January 2025"
  *                       total:
  *                         type: integer
  *                         example: 15
  *       400:
  *         description: Invalid year parameter
  *       401:
  *         description: Not authenticated
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: false
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/dashboard/counts/totals:
  *   get:
  *     summary: Get combined total counts for dashboard
  *     tags: [Dashboard]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Retrieve combined total counts including:
  *       - User counts by role (farmer, mycologist, curator, admin)
  *       - User active/inactive status counts
  *       - Mold report status counts (total, pending, in_progress, resolved, closed)
  *       - Mold case priority breakdown (low, medium, high)
  *       Results are cached for 1 hour.
  *     responses:
  *       200:
  *         description: Combined counts retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: object
  *                   properties:
  *                     users:
  *                       type: object
  *                       example: {"farmer": 10, "mycologist": 5, "curator": 3, "admin": 1}
  *                       description: User counts grouped by role
  *                     userStatus:
  *                       type: object
  *                       properties:
  *                         active:
  *                           type: integer
  *                           example: 15
  *                         inactive:
  *                           type: integer
  *                           example: 4
  *                       description: Active and inactive user counts
  *                     moldReports:
  *                       type: object
  *                       properties:
  *                         total:
  *                           type: integer
  *                           example: 50
  *                         pending:
  *                           type: integer
  *                           example: 10
  *                         in_progress:
  *                           type: integer
  *                           example: 20
  *                         resolved:
  *                           type: integer
  *                           example: 15
  *                         closed:
  *                           type: integer
  *                           example: 5
  *                       description: Mold report counts by status
  *                     moldCases:
  *                       type: object
  *                       properties:
  *                         low:
  *                           type: integer
  *                           example: 25
  *                         medium:
  *                           type: integer
  *                           example: 18
  *                         high:
  *                           type: integer
  *                           example: 7
  *                       description: Mold case counts by priority
  *       401:
  *         description: Not authenticated
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: false
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/mold-report/counts/priorities:
  *   get:
  *     summary: Get mold case priority breakdown counts
  *     tags: [MoldReport]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Retrieve mold case counts broken down by priority level:
  *       - low: Low priority cases
  *       - medium: Medium priority cases
  *       - high: High priority cases
  *       Results are cached for 1 hour.
  *     responses:
  *       200:
  *         description: Priority breakdown retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: object
  *                   properties:
  *                     low:
  *                       type: integer
  *                       example: 25
  *                       description: Count of low priority cases
  *                     medium:
  *                       type: integer
  *                       example: 18
  *                       description: Count of medium priority cases
  *                     high:
  *                       type: integer
  *                       example: 7
  *                       description: Count of high priority cases
  *       401:
  *         description: Not authenticated
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: false
  *                 error:
  *                   type: string
  */
