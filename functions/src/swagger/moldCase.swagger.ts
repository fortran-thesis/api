/**
  * @swagger
  * /api/v1/mold-case:
  *   post:
  *     summary: Create a new mold folder
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               user_id:
  *                 type: string
  *               mycologist_id:
  *                 type: string
  *               name:
  *                 type: string
  *               mold_report_id:
  *                 type: string
  *               photo_url:
  *                 type: string
  *               priority:
  *                 type: string
  *                 enum: [low, medium, high]
  *               start_date:
  *                 type: string
  *                 format: date-time
  *               end_date:
  *                 type: string
  *                 format: date-time
  *     responses:
  *       200:
  *         description: Successfully created mold folder
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
  *                     mycologist_id:
  *                       type: string
  *                     name:
  *                       type: string
  *                     mold_report_id:
  *                       type: string
  *                     photo_url:
  *                       type: string
  *                       nullable: true
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                     start_date:
  *                       type: string
  *                       format: date-time
  *                     end_date:
  *                       type: string
  *                       format: date-time
  *                     is_archived:
  *                       type: boolean
  *       400:
  *         description: Validation error
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
  * /api/v1/mold-case:
  *   get:
  *     summary: Get all mold folders for a user
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Page size
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token
  *     responses:
  *       200:
  *         description: List of mold folders
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
  *                           mycologist_id:
  *                             type: string
  *                           name:
  *                             type: string
  *                           mold_report_id:
  *                             type: string
  *                           photo_url:
  *                             type: string
  *                             nullable: true
  *                           priority:
  *                             type: string
  *                             enum: [low, medium, high]
  *                           start_date:
  *                             type: string
  *                             format: date-time
  *                           end_date:
  *                             type: string
  *                             format: date-time
  *                           is_archived:
  *                             type: boolean
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
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
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Not found
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
  * /api/v1/mold-case/assigned:
  *   get:
  *     summary: Get all mold cases assigned to the authenticated curator
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication with CURATOR role (Bearer token or session cookie)
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Page size
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token
  *     responses:
  *       200:
  *         description: List of assigned mold cases
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
  *                           mycologist_id:
  *                             type: string
  *                           name:
  *                             type: string
  *                           mold_report_id:
  *                             type: string
  *                           user_id:
  *                             type: string
  *                             nullable: true
  *                           user_name:
  *                             type: string
  *                             nullable: true
  *                           photo_url:
  *                             type: string
  *                             nullable: true
  *                           priority:
  *                             type: string
  *                             enum: [low, medium, high]
  *                           start_date:
  *                             type: string
  *                             format: date-time
  *                           end_date:
  *                             type: string
  *                             format: date-time
  *                           is_archived:
  *                             type: boolean
  *                           cultivation_details:
  *                             type: object
  *                             nullable: true
  *                           final_verdict:
  *                             type: object
  *                             nullable: true
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized (not a curator)
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
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Not found
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
  * /api/v1/mold-case/archive:
  *   get:
  *     summary: Get all archived mold folders for a user
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
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
  *         description: List of archived mold folders
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
  *                           mycologist_id:
  *                             type: string
  *                           name:
  *                             type: string
  *                           mold_report_id:
  *                             type: string
  *                           photo_url:
  *                             type: string
  *                             nullable: true
  *                           priority:
  *                             type: string
  *                             enum: [low, medium, high]
  *                           start_date:
  *                             type: string
  *                             format: date-time
  *                           end_date:
  *                             type: string
  *                             format: date-time
  *                           is_archived:
  *                             type: boolean
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       401:
  *         description: Unauthorized
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
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Not found
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
  * /api/v1/mold-case/{id}:
  *   patch:
  *     summary: Update a mold folder
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold folder ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               name:
  *                 type: string
  *               photo_url:
  *                 type: string
  *               priority:
  *                 type: string
  *                 enum: [low, medium, high]
  *               is_archived:
  *                 type: boolean
  *     responses:
  *       200:
  *         description: Successfully updated mold folder
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
  *                     mycologist_id:
  *                       type: string
  *                     name:
  *                       type: string
  *                     mold_report_id:
  *                       type: string
  *                     photo_url:
  *                       type: string
  *                       nullable: true
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                     start_date:
  *                       type: string
  *                       format: date-time
  *                     end_date:
  *                       type: string
  *                       format: date-time
  *                     is_archived:
  *                       type: boolean
  *       400:
  *         description: Validation error
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
  *       404:
  *         description: Not found
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
  * /api/v1/mold-case/hard/{id}:
  *   delete:
  *     summary: Hard delete mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     responses:
  *       200:
  *         description: Successfully deleted mold case
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: string
  *                   example: "Successfully deleted mold case"
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
  * /api/v1/mold-case/soft/{id}:
  *   delete:
  *     summary: Soft delete mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     responses:
  *       200:
  *         description: Successfully soft deleted mold case
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: string
  *                   example: "Successfully soft deleted mold case."
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
  * /api/v1/mold-case/by-report/{id}:
  *   get:
  *     summary: Get mold case by report ID
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve the mold case associated with a given mold report ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold report ID
  *     responses:
  *       200:
  *         description: Mold case retrieved successfully
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
  *                     mycologist_id:
  *                       type: string
  *                     name:
  *                       type: string
  *                     mold_report_id:
  *                       type: string
  *                     user_id:
  *                       type: string
  *                       nullable: true
  *                       description: ID of the farmer/user who created the mold report
  *                     user_name:
  *                       type: string
  *                       nullable: true
  *                       description: Display name of the farmer/user
  *                     photo_url:
  *                       type: string
  *                       nullable: true
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                     start_date:
  *                       type: string
  *                       format: date-time
  *                     end_date:
  *                       type: string
  *                       format: date-time
  *                     is_archived:
  *                       type: boolean
  *                     cultivation_details:
  *                       type: object
  *                       nullable: true
  *                       description: Detailed cultivation information including growth conditions and observations
  *                       properties:
  *                         growth_medium:
  *                           type: string
  *                         in_vivo_details:
  *                           type: object
  *                           properties:
  *                             environmental_temperature:
  *                               type: number
  *                         in_vitro_details:
  *                           type: object
  *                           properties:
  *                             incubation_temperature:
  *                               type: number
  *                         specimen_types:
  *                           type: array
  *                           items:
  *                             type: string
  *                         specimen_quantities:
  *                           type: array
  *                           items:
  *                             type: string
  *                         initial_symptoms:
  *                           type: array
  *                           items:
  *                             type: string
  *                         initial_characteristics:
  *                           type: array
  *                           items:
  *                             type: string
  *                         location_gathered:
  *                           type: string
  *                         initial_microscopic:
  *                           type: string
  *                         initial_macroscopic:
  *                           type: string
  *                         initial_microscopic_color:
  *                           type: string
  *                         initial_microscopic_texture:
  *                           type: string
  *                         initial_macroscopic_color:
  *                           type: string
  *                         initial_macroscopic_texture:
  *                           type: string
  *                         initial_macroscopic_symptoms:
  *                           type: string
  *                         initial_macroscopic_characteristics:
  *                           type: string
  *                         initial_microscopic_image_url:
  *                           type: string
  *                           nullable: true
  *                           description: Signed URL for microscopic image. Valid for 2 hours.
  *                         initial_macroscopic_image_url:
  *                           type: string
  *                           nullable: true
  *                           description: Signed URL for macroscopic image. Valid for 2 hours.
  *                         date_observation:
  *                           type: string
  *                         microscopic_ai_snapshot:
  *                           type: object
  *                           description: AI-generated identification snapshot
  *                         scanned_microscopic_ids:
  *                           type: array
  *                           items:
  *                             type: string
  *                         scanned_macroscopic_ids:
  *                           type: array
  *                           items:
  *                             type: string
  *                     final_verdict:
  *                       type: object
  *                       nullable: true
  *                       description: Final identification verdict by mycologist
  *                       properties:
  *                         moldId:
  *                           type: string
  *                           description: ID of the identified mold
  *                         moldName:
  *                           type: string
  *                           description: Name of the identified mold
  *                         confidence:
  *                           type: number
  *                           description: Confidence score of the identification
  *                         moldipedia_id:
  *                           type: string
  *                           nullable: true
  *                           description: Link to moldipedia article if available
  *                         mycologist_notes:
  *                           type: string
  *                           nullable: true
  *                           description: Additional notes from the reviewing mycologist
  *                         verdict_timestamp:
  *                           type: string
  *                           format: date-time
  *                           nullable: true
  *                           description: Timestamp when verdict was finalized
  *       404:
  *         description: No mold case found for this report
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
  *       403:
  *         description: Forbidden
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
  * /api/v1/mold-case/{id}/logs:
  *   post:
  *     summary: Add a cultivation log entry to a mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Add a cultivation log entry to a mold case with optional image upload. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             required:
  *               - type
  *             properties:
  *               type:
  *                 type: string
  *                 enum: [vivo, vitro]
  *                 description: Cultivation type (vivo for in vivo, vitro for in vitro)
  *               characteristics:
  *                 type: string
  *                 description: >
  *                   JSON-encoded string. Parsed by route middleware before schema validation.
  *                   For vivo: {"lesion_size": number, "lesion_color": string}.
  *                   For vitro: {"colony_diameter": number, "colony_color": string}.
  *               additional_info:
  *                 type: string
  *                 description: Additional observations about the cultivation
  *               image:
  *                 type: string
  *                 format: binary
  *                 description: Optional cultivation log image
  *     responses:
  *       200:
  *         description: Cultivation log added successfully
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
  *                   description: The newly created cultivation log document
  *                   properties:
  *                     id:
  *                       type: string
  *                       description: Subcollection document ID
  *                     type:
  *                       type: string
  *                       enum: [vivo, vitro]
  *                     image_url:
  *                       type: string
  *                       nullable: true
  *                       description: Signed URL. Valid for 2 hours.
  *                     characteristics:
  *                       type: object
  *                     additional_info:
  *                       type: string
  *       400:
  *         description: Failed to add cultivation log
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
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
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
  * /api/v1/mold-case/{id}/cultivation-details:
  *   patch:
  *     summary: Update cultivation details for a mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Updates cultivation details on a mold case using deep-merge semantics.
  *
  *       Side effect: if the linked MoldReport contains `reported_symptoms`, `reported_signs`, or `reported_characteristics`, a background mold lookup is re-run after this update. Characteristics from `in_vivo_details.lesion_color` and `in_vitro_details.colony_color` and any available microscopic identification names from initial/in vivo/in vitro observations are appended to the lookup inputs. On completion, `lookup_results` on the MoldReport is updated and `cultivation_details.microscopic_ai_snapshot` on this case is overwritten with the top lookup result.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               cultivation_details:
  *                 type: object
  *                 description: Merged with existing cultivation_details in Firestore. Nested objects (in_vivo_details, in_vitro_details, initial_observations, microscopic_ai_snapshot) are deep-merged, not replaced.
  *                 properties:
  *                   growth_medium:
  *                     type: string
  *                   in_vivo_details:
  *                     type: object
  *                     properties:
  *                       environmental_temperature:
  *                         type: number
  *                   in_vitro_details:
  *                     type: object
  *                     properties:
  *                       incubation_temperature:
  *                         type: number
  *                   specimen_types:
  *                     type: array
  *                     items:
  *                       type: string
  *                   specimen_quantities:
  *                     type: array
  *                     items:
  *                       type: string
  *                   initial_symptoms:
  *                     type: array
  *                     items:
  *                       type: string
  *                   initial_characteristics:
  *                     type: array
  *                     items:
  *                       type: string
  *                   location_gathered:
  *                     type: string
  *                   initial_microscopic:
  *                     type: string
  *                     description: If provided and `microscopic_ai_snapshot.identified_mold` is absent, this value is copied into the snapshot as a fallback.
  *                   initial_macroscopic:
  *                     type: string
  *                   initial_microscopic_image_url:
  *                     type: string
  *                   initial_macroscopic_image_url:
  *                     type: string
  *                   date_observation:
  *                     type: string
  *                   microscopic_ai_snapshot:
  *                     type: object
  *                     description: AI-generated identification snapshot.
  *                   scanned_microscopic_ids:
  *                     type: array
  *                     items:
  *                       type: string
  *                     description: Deduplicated on write.
  *                   scanned_macroscopic_ids:
  *                     type: array
  *                     items:
  *                       type: string
  *                     description: Deduplicated on write.
  *               start_date:
  *                 type: string
  *                 format: date-time
  *               end_date:
  *                 type: string
  *                 format: date-time
  *     responses:
  *       200:
  *         description: Cultivation details updated successfully
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
  *                     id:
  *                       type: string
  *                     mycologist_id:
  *                       type: string
  *                     name:
  *                       type: string
  *                     mold_report_id:
  *                       type: string
  *                     photo_url:
  *                       type: string
  *                       nullable: true
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                     start_date:
  *                       type: string
  *                       format: date-time
  *                     end_date:
  *                       type: string
  *                       format: date-time
  *                     is_archived:
  *                       type: boolean
  *                     cultivation_details:
  *                       type: object
  *                       properties:
  *                         growth_medium:
  *                           type: string
  *                         in_vivo_details:
  *                           type: object
  *                         in_vitro_details:
  *                           type: object
  *       400:
  *         description: Failed to update cultivation details
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
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
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
  * /api/v1/mold-case/{id}/analyze-cultivation:
  *   post:
  *     summary: Analyze cultivation image using AI
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Analyze a cultivation image using Gemini AI to provide insights. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             required:
  *               - type
  *               - image
  *             properties:
  *               type:
  *                 type: string
  *                 enum: [vivo, vitro]
  *                 description: Cultivation type (vivo for in vivo, vitro for in vitro)
  *               image:
  *                 type: string
  *                 format: binary
  *                 description: Cultivation image to analyze (JPEG or PNG)
  *     responses:
  *       200:
  *         description: Image analyzed successfully
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
  *                     type:
  *                       type: string
  *                       enum: [vivo, vitro]
  *                       description: Cultivation type analyzed
  *                     characteristics:
  *                       oneOf:
  *                         - type: object
  *                           description: Vivo analysis characteristics
  *                           properties:
  *                             lesion_size:
  *                               type: number
  *                               description: Lesion size in millimeters
  *                             lesion_color:
  *                               type: string
  *                               description: Predominant lesion color
  *                         - type: object
  *                           description: Vitro analysis characteristics
  *                           properties:
  *                             colony_diameter:
  *                               type: number
  *                               description: Colony diameter in millimeters
  *                             colony_color:
  *                               type: string
  *                               description: Predominant colony color
  *                     additional_info:
  *                       type: string
  *                       description: Additional observations about the cultivation
  *                     confidence:
  *                       type: string
  *                       description: Confidence level of the analysis (percentage)
  *       400:
  *         description: Invalid cultivation type or no image provided
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
  *       500:
  *         description: Failed to analyze image
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
  * /api/v1/mold-case/search:
  *   get:
  *     summary: Search and filter assigned mold cases for mycologist
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Search and filter mold cases assigned to the authenticated mycologist.
  *       Supports searching by case name and filtering by priority.
  *     parameters:
  *       - in: query
  *         name: search
  *         schema:
  *           type: string
  *         description: Search term for case name
  *       - in: query
  *         name: priority
  *         schema:
  *           type: string
  *           enum: [low, medium, high]
  *         description: Filter by mold case priority
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
  *         description: Filtered and searched mold cases
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
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                     nextPageToken:
  *                       type: string
  *       401:
  *         description: Not authenticated
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-case/{id}:
  *   get:
  *     summary: Get a mold case by ID
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     responses:
  *       200:
  *         description: Mold case retrieved successfully
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
  *                     id:
  *                       type: string
  *                     mycologist_id:
  *                       type: string
  *                     name:
  *                       type: string
  *                     mold_report_id:
  *                       type: string
  *                     photo_url:
  *                       type: string
  *                       nullable: true
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     priority:
  *                       type: string
  *                       enum: [low, medium, high]
  *                     start_date:
  *                       type: string
  *                       format: date-time
  *                     end_date:
  *                       type: string
  *                       format: date-time
  *                     is_archived:
  *                       type: boolean
  *                     cultivation_details:
  *                       type: object
  *                       nullable: true
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
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
  * /api/v1/mold-case/{id}/archive:
  *   patch:
  *     summary: Archive a mold case (move to case history)
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Sets is_archived to true, moving the case to case history. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     responses:
  *       200:
  *         description: Mold case archived successfully
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
  *                     id:
  *                       type: string
  *                     is_archived:
  *                       type: boolean
  *                       example: true
  *       404:
  *         description: Mold case not found
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
  * /api/v1/mold-case/{id}/unarchive:
  *   patch:
  *     summary: Restore a mold case from case history (unarchive)
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Sets is_archived to false, restoring the case to active. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     responses:
  *       200:
  *         description: Mold case restored successfully
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
  *                     id:
  *                       type: string
  *                     is_archived:
  *                       type: boolean
  *                       example: false
  *       404:
  *         description: Mold case not found
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
  * /api/v1/mold-case/{id}/logs:
  *   get:
  *     summary: Get all cultivation logs for a mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Returns paginated cultivation logs from the subcollection. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *           default: 50
  *         description: Maximum number of logs to return
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: Cultivation logs retrieved successfully
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
  *                             description: Subcollection document ID
  *                           type:
  *                             type: string
  *                             enum: [vivo, vitro]
  *                           image_url:
  *                             type: string
  *                             nullable: true
  *                             description: Signed URL. Valid for 2 hours.
  *                           characteristics:
  *                             type: object
  *                           additional_info:
  *                             type: string
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *                       description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
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
  * /api/v1/mold-case/{id}/logs/{logId}:
  *   delete:
  *     summary: Remove a cultivation log entry by ID
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Removes the cultivation log with the given document ID from the subcollection. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *       - in: path
  *         name: logId
  *         required: true
  *         schema:
  *           type: string
  *         description: Cultivation log document ID
  *     responses:
  *       200:
  *         description: Cultivation log removed successfully
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
  *                     deleted:
  *                       type: boolean
  *       400:
  *         description: Invalid log ID
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
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case or log not found
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
  * /api/v1/mold-case/{id}/verdict:
  *   patch:
  *     summary: Finalize mold verdict for a case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Record the final mycologist verdict for a mold case based on lookup results
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               moldId:
  *                 type: string
  *                 description: Also accepted as `mold_id`.
  *               mold_id:
  *                 type: string
  *                 description: Alias for `moldId`.
  *               moldName:
  *                 type: string
  *                 description: Also accepted as `mold_name`.
  *               mold_name:
  *                 type: string
  *                 description: Alias for `moldName`.
  *               confidence:
  *                 type: number
  *                 minimum: 0
  *                 maximum: 100
  *               mycologist_notes:
  *                 type: string
  *             required:
  *               - confidence
  *             description: At least one of `moldId`/`mold_id` and one of `moldName`/`mold_name` must be provided.
  *     responses:
  *       200:
  *         description: >
  *           Verdict finalized. The mold case is archived (is_archived: true) and the linked
  *           MoldReport status is set to resolved. If the report update fails (e.g., report not
  *           in "in progress" status), the verdict is still saved and report_sync_warning will
  *           contain a non-null description of the failure.
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
  *                     moldCaseId:
  *                       type: string
  *                     report_owner_id:
  *                       type: string
  *                       nullable: true
  *                     case_name:
  *                       type: string
  *                     final_verdict:
  *                       type: object
  *                       properties:
  *                         moldId:
  *                           type: string
  *                         moldName:
  *                           type: string
  *                         confidence:
  *                           type: number
  *                         mycologist_notes:
  *                           type: string
  *                           nullable: true
  *                         verdict_timestamp:
  *                           type: string
  *                           format: date-time
  *                     report_sync_warning:
  *                       type: string
  *                       nullable: true
  *                       description: Non-null when the linked MoldReport could not be updated to `resolved` status. The verdict itself was still saved successfully.
  *       400:
  *         description: Validation error
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/moldipedia/{id}/cases:
  *   get:
  *     summary: List mold cases linked to a moldipedia article
  *     tags: [Moldipedia, MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Moldipedia article ID
  *     responses:
  *       200:
  *         description: List of mold cases
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                 data:
  *                   type: array
  *                   items:
  *                     $ref: '#/components/schemas/MoldCase'
  *       404:
  *         description: No cases found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/mold-case/{id}/culture-sessions:
  *   get:
  *     summary: List culture sessions for a mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *     responses:
  *       200:
  *         description: Culture sessions retrieved successfully
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
  *   post:
  *     summary: Create a culture session for a mold case
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - name
  *               - target_at
  *             properties:
  *               name:
  *                 type: string
  *               target_at:
  *                 type: string
  *                 format: date-time
  *     responses:
  *       200:
  *         description: Culture session created successfully
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
  */

/**
  * @swagger
  * /api/v1/mold-case/{id}/culture-sessions/available:
  *   get:
  *     summary: List only available culture sessions for log assignment
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Mold case ID
  *     responses:
  *       200:
  *         description: Available culture sessions retrieved successfully
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case not found
  */

/**
  * @swagger
  * /api/v1/mold-case/{id}/culture-sessions/{cultureId}/end-early:
  *   patch:
  *     summary: End a culture session early
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *       - in: path
  *         name: cultureId
  *         required: true
  *         schema:
  *           type: string
  *     responses:
  *       200:
  *         description: Culture session ended early
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case or culture session not found
  */

/**
  * @swagger
  * /api/v1/mold-case/{id}/culture-sessions/{cultureId}/reassign:
  *   patch:
  *     summary: Reassign culture session target date
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *       - in: path
  *         name: cultureId
  *         required: true
  *         schema:
  *           type: string
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - target_at
  *             properties:
  *               target_at:
  *                 type: string
  *                 format: date-time
  *     responses:
  *       200:
  *         description: Culture session timer reassigned
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case or culture session not found
  */

/**
  * @swagger
  * /api/v1/mold-case/{id}/culture-sessions/{cultureId}:
  *   delete:
  *     summary: Soft delete a culture session
  *     tags: [MoldCases]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *       - in: path
  *         name: cultureId
  *         required: true
  *         schema:
  *           type: string
  *     responses:
  *       200:
  *         description: Culture session deleted
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Mold case or culture session not found
  */
