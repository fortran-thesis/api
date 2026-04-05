/**
  * @swagger
  * /api/v1/moldipedia:
  *   post:
  *     summary: Create a new moldipedia article
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             required:
  *               - cover_photo
  *             properties:
  *               details:
  *                 type: object
  *                 description: Optional JSON object wrapper for article data. Supports nested treatments and findings. If provided as JSON string (multipart/form-data), parseMultipartJson middleware promotes them to top-level body fields.
  *                 properties:
  *                   title:
  *                     type: string
  *                   body:
  *                     type: string
  *                   author_id:
  *                     type: string
  *                   mold_type:
  *                     type: string
  *                   affected_hosts:
  *                     type: string
  *                     description: HTML - affected hosts/crops
  *                   symptoms:
  *                     type: string
  *                     description: HTML - symptoms and infection signs
  *                   disease_cycle:
  *                     type: string
  *                     description: HTML - disease spread and lifecycle
  *                   impact:
  *                     type: string
  *                     description: HTML - economic/health impact
  *                   prevention:
  *                     type: string
  *                     description: HTML - prevention strategies
  *                   treatments:
  *                     type: object
  *                     description: Treatment protocols with nested structure
  *                     properties:
  *                       mechanical:
  *                         type: string
  *                         description: HTML - mechanical removal methods
  *                       cultural:
  *                         type: string
  *                         description: HTML - cultural modifications
  *                       biological:
  *                         type: string
  *                         description: HTML - biological approaches
  *                       physical:
  *                         type: string
  *                         description: HTML - physical control methods
  *                       chemical:
  *                         type: string
  *                         description: HTML - chemical applications
  *                   findings:
  *                     type: array
  *                     description: Research findings or discovery stages
  *                     items:
  *                       type: object
  *                       properties:
  *                         title:
  *                           type: string
  *                         content:
  *                           type: string
  *                   tags:
  *                     type: array
  *                     items:
  *                       type: string
  *                 example:
  *                   title: "Understanding Aspergillus"
  *                   body: "Aspergillus is a genus..."
  *                   author_id: "user123"
  *               title:
  *                 type: string
  *                 description: Top-level title is supported as alternative to details.title.
  *               body:
  *                 type: string
  *                 description: Top-level body is supported as alternative to details.body.
  *               author_id:
  *                 type: string
  *                 description: Optional. If omitted, the authenticated user's ID is used.
  *               cover_photo:
  *                 type: string
  *                 format: binary
  *                 description: Required. JPEG or PNG only.
  *     responses:
  *       200:
  *         description: Successfully created moldipedia article with all fields
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
  *                       description: Unique article identifier
  *                     title:
  *                       type: string
  *                       description: Article title
  *                     body:
  *                       type: string
  *                       description: Main article content (HTML)
  *                     author_id:
  *                       type: string
  *                       description: User ID of article author
  *                     cover_photo:
  *                       type: string
  *                       description: URL to cover image (signed URL)
  *                     tags:
  *                       type: array
  *                       items:
  *                         type: string
  *                       description: Article classification tags
  *                     mold_type:
  *                       type: string
  *                       nullable: true
  *                       description: Scientific or common classification of mold
  *                     affected_hosts:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content describing affected hosts/crops
  *                     symptoms:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content describing symptoms and infection signs
  *                     disease_cycle:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content describing disease spread and lifecycle
  *                     impact:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content describing economic/health impact
  *                     prevention:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content describing prevention strategies
  *                     treatment_mechanical:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content for mechanical removal methods (flattened from nested input)
  *                     treatment_cultural:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content for cultural modifications
  *                     treatment_biological:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content for biological approaches
  *                     treatment_physical:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content for physical control methods
  *                     treatment_chemical:
  *                       type: string
  *                       nullable: true
  *                       description: HTML content for chemical applications
  *                     findings:
  *                       type: array
  *                       nullable: true
  *                       description: Research findings or discovery stages
  *                       items:
  *                         type: object
  *                         properties:
  *                           title:
  *                             type: string
  *                           content:
  *                             type: string
  *                     mycologist_id:
  *                       type: string
  *                       nullable: true
  *                       description: ID of mycologist who reviewed/approved article
  *                     approved_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
  *                       description: Timestamp when article was approved
  *                     is_archived:
  *                       type: boolean
  *                       example: false
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
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
  * /api/v1/moldipedia:
  *   get:
  *     summary: Get all moldipedia articles
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *       - Returns paginated list with all available fields
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Page size (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *       - in: query
  *         name: search
  *         schema:
  *           type: string
  *         description: Search query to filter articles by title or body
  *     responses:
  *       200:
  *         description: List of moldipedia articles with pagination
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
  *                       description: Array of moldipedia articles
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           title:
  *                             type: string
  *                           body:
  *                             type: string
  *                           author:
  *                             type: string
  *                             description: Display name of author (resolved from author_id)
  *                           cover_photo:
  *                             type: string
  *                             description: URL to cover image
  *                           tags:
  *                             type: array
  *                             items:
  *                               type: string
  *                           mold_type:
  *                             type: string
  *                             nullable: true
  *                           affected_hosts:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - affected hosts/crops
  *                           symptoms:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - symptoms
  *                           disease_cycle:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - disease spread/lifecycle
  *                           impact:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - economic/health impact
  *                           prevention:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - prevention strategies
  *                           treatment_mechanical:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - mechanical methods
  *                           treatment_cultural:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - cultural methods
  *                           treatment_biological:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - biological methods
  *                           treatment_physical:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - physical methods
  *                           treatment_chemical:
  *                             type: string
  *                             nullable: true
  *                             description: HTML - chemical methods
  *                           findings:
  *                             type: array
  *                             nullable: true
  *                             description: Research findings array
  *                             items:
  *                               type: object
  *                               properties:
  *                                 title:
  *                                   type: string
  *                                 content:
  *                                   type: string
  *                           mycologist_id:
  *                             type: string
  *                             nullable: true
  *                             description: ID of mycologist who reviewed/approved this article
  *                           approved_at:
  *                             type: string
  *                             format: date-time
  *                             nullable: true
  *                             description: Timestamp when the article was reviewed/approved
  *                           created_at:
  *                             type: string
  *                             format: date-time
  *                           updated_at:
  *                             type: string
  *                             format: date-time
  *                             nullable: true
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       404:
  *         description: Not found
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/moldipedia/{id}:
  *   get:
  *     summary: Get moldipedia article by ID with complete details
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *       - Returns complete article with all advanced fields
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Moldipedia article ID
  *     responses:
  *       200:
  *         description: Complete moldipedia article with all fields
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
  *                     title:
  *                       type: string
  *                     body:
  *                       type: string
  *                       description: Main article content (HTML)
  *                     author:
  *                       type: string
  *                       description: Display name of author
  *                     cover_photo:
  *                       type: string
  *                       description: URL to cover image (signed URL)
  *                     tags:
  *                       type: array
  *                       items:
  *                         type: string
  *                     mold_type:
  *                       type: string
  *                       nullable: true
  *                     affected_hosts:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - affected hosts/crops
  *                     symptoms:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - symptoms and signs
  *                     disease_cycle:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - disease cycle and lifecycle
  *                     impact:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - economic/health impact
  *                     prevention:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - prevention strategies
  *                     treatment_mechanical:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - mechanical methods
  *                     treatment_cultural:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - cultural methods
  *                     treatment_biological:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - biological methods
  *                     treatment_physical:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - physical methods
  *                     treatment_chemical:
  *                       type: string
  *                       nullable: true
  *                       description: HTML - chemical methods
  *                     findings:
  *                       type: array
  *                       nullable: true
  *                       description: Research findings array
  *                       items:
  *                         type: object
  *                         properties:
  *                           title:
  *                             type: string
  *                           content:
  *                             type: string
  *                     mycologist_id:
  *                       type: string
  *                       nullable: true
  *                       description: ID of mycologist reviewer
  *                     approved_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
  *                       description: Approval timestamp
  *                     is_archived:
  *                       type: boolean
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
  *       404:
  *         description: Not found
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/moldipedia/{id}:
  *   patch:
  *     summary: Update moldipedia article
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *       - Allows partial updates to article fields. Supports nested treatments in request (flattened in response).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Moldipedia article ID
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             properties:
  *               details:
  *                 type: object
  *                 description: Optional JSON object wrapper. Supports all article fields including nested treatments. Fields are promoted to top-level by parseMultipartJson.
  *                 properties:
  *                   title:
  *                     type: string
  *                   body:
  *                     type: string
  *                   mold_type:
  *                     type: string
  *                   affected_hosts:
  *                     type: string
  *                   symptoms:
  *                     type: string
  *                   disease_cycle:
  *                     type: string
  *                   impact:
  *                     type: string
  *                   prevention:
  *                     type: string
  *                   treatments:
  *                     type: object
  *                     description: Treatment protocols (nested in request, flattened in response as treatment_mechanical, etc)
  *                     properties:
  *                       mechanical:
  *                         type: string
  *                       cultural:
  *                         type: string
  *                       biological:
  *                         type: string
  *                       physical:
  *                         type: string
  *                       chemical:
  *                         type: string
  *                   findings:
  *                     type: array
  *                     items:
  *                       type: object
  *                       properties:
  *                         title:
  *                           type: string
  *                         content:
  *                           type: string
  *                   tags:
  *                     type: array
  *                     items:
  *                       type: string
  *               title:
  *                 type: string
  *                 description: Top-level title is supported as alternative to details.title.
  *               body:
  *                 type: string
  *                 description: Top-level body is supported as alternative to details.body.
  *               cover_photo:
  *                 type: string
  *                 format: binary
  *                 description: Optional. If provided, the existing cover photo is replaced. New signed URL is returned in the response.
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               title:
  *                 type: string
  *               body:
  *                 type: string
  *               mold_type:
  *                 type: string
  *               affected_hosts:
  *                 type: string
  *               symptoms:
  *                 type: string
  *               disease_cycle:
  *                 type: string
  *               impact:
  *                 type: string
  *               prevention:
  *                 type: string
  *               treatments:
  *                 type: object
  *                 properties:
  *                   mechanical:
  *                     type: string
  *                   cultural:
  *                     type: string
  *                   biological:
  *                     type: string
  *                   physical:
  *                     type: string
  *                   chemical:
  *                     type: string
  *               findings:
  *                 type: array
  *                 items:
  *                   type: object
  *                   properties:
  *                     title:
  *                       type: string
  *                     content:
  *                       type: string
  *               tags:
  *                 type: array
  *                 items:
  *                   type: string
  *     responses:
  *       200:
  *         description: Successfully updated moldipedia article
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
  *                   description: Updated moldipedia article with all fields
  *                   properties:
  *                     id:
  *                       type: string
  *                     title:
  *                       type: string
  *                     body:
  *                       type: string
  *                     author_id:
  *                       type: string
  *                     cover_photo:
  *                       type: string
  *                     tags:
  *                       type: array
  *                       items:
  *                         type: string
  *                     mold_type:
  *                       type: string
  *                       nullable: true
  *                     affected_hosts:
  *                       type: string
  *                       nullable: true
  *                     symptoms:
  *                       type: string
  *                       nullable: true
  *                     disease_cycle:
  *                       type: string
  *                       nullable: true
  *                     impact:
  *                       type: string
  *                       nullable: true
  *                     prevention:
  *                       type: string
  *                       nullable: true
  *                     treatment_mechanical:
  *                       type: string
  *                       nullable: true
  *                     treatment_cultural:
  *                       type: string
  *                       nullable: true
  *                     treatment_biological:
  *                       type: string
  *                       nullable: true
  *                     treatment_physical:
  *                       type: string
  *                       nullable: true
  *                     treatment_chemical:
  *                       type: string
  *                       nullable: true
  *                     findings:
  *                       type: array
  *                       nullable: true
  *                       items:
  *                         type: object
  *                         properties:
  *                           title:
  *                             type: string
  *                           content:
  *                             type: string
  *                     mycologist_id:
  *                       type: string
  *                       nullable: true
  *                     approved_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
  *                     is_archived:
  *                       type: boolean
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *                       nullable: true
  *       400:
  *         description: Validation error
  *       404:
  *         description: Not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/moldipedia/{id}:
  *   delete:
  *     summary: Delete moldipedia article
  *     tags: [Moldipedia]
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
  *         description: Moldipedia article ID
  *     responses:
  *       200:
  *         description: Successfully deleted moldipedia article
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: string
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/moldipedia/soft/{id}:
  *   delete:
  *     summary: Soft delete moldipedia article
  *     tags: [Moldipedia]
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
  *         description: Moldipedia article ID
  *     responses:
  *       200:
  *         description: Successfully soft deleted moldipedia article
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: string
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/moldipedia/archive:
  *   get:
  *     summary: Get all archived moldipedia articles
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Returns all moldipedia articles where is_archived is true. Requires Curator role.
  *       - Returns complete articles with all fields
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
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: Paginated list of archived moldipedia articles
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
  *                           title:
  *                             type: string
  *                           body:
  *                             type: string
  *                           author:
  *                             type: string
  *                           cover_photo:
  *                             type: string
  *                           tags:
  *                             type: array
  *                             items:
  *                               type: string
  *                           mold_type:
  *                             type: string
  *                             nullable: true
  *                           affected_hosts:
  *                             type: string
  *                             nullable: true
  *                           symptoms:
  *                             type: string
  *                             nullable: true
  *                           disease_cycle:
  *                             type: string
  *                             nullable: true
  *                           impact:
  *                             type: string
  *                             nullable: true
  *                           prevention:
  *                             type: string
  *                             nullable: true
  *                           treatment_mechanical:
  *                             type: string
  *                             nullable: true
  *                           treatment_cultural:
  *                             type: string
  *                             nullable: true
  *                           treatment_biological:
  *                             type: string
  *                             nullable: true
  *                           treatment_physical:
  *                             type: string
  *                             nullable: true
  *                           treatment_chemical:
  *                             type: string
  *                             nullable: true
  *                           findings:
  *                             type: array
  *                             nullable: true
  *                             items:
  *                               type: object
  *                               properties:
  *                                 title:
  *                                   type: string
  *                                 content:
  *                                   type: string
  *                           is_archived:
  *                             type: boolean
  *                             example: true
  *                           created_at:
  *                             type: string
  *                             format: date-time
  *                           updated_at:
  *                             type: string
  *                             format: date-time
  *                           mycologist_id:
  *                             type: string
  *                             nullable: true
  *                             description: ID of the mycologist who reviewed/approved this article
  *                           approved_at:
  *                             type: string
  *                             format: date-time
  *                             nullable: true
  *                             description: Timestamp when the article was reviewed/approved
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
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
  * /api/v1/moldipedia/{id}/archive:
  *   patch:
  *     summary: Archive a moldipedia article
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Sets is_archived to true on the specified article. Requires Curator role.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Moldipedia article ID
  *     responses:
  *       200:
  *         description: Moldipedia article archived successfully
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
  *                     title:
  *                       type: string
  *                     is_archived:
  *                       type: boolean
  *                       example: true
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
  * /api/v1/moldipedia/{id}/unarchive:
  *   patch:
  *     summary: Restore a moldipedia article from archive
  *     tags: [Moldipedia]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Sets is_archived to false on the specified article. Requires Curator role.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Moldipedia article ID
  *     responses:
  *       200:
  *         description: Moldipedia article restored successfully
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
  *                     title:
  *                       type: string
  *                     is_archived:
  *                       type: boolean
  *                       example: false
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
