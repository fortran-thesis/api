/**
 * Swagger Schema Definitions
 * This file contains all the schema definitions for the API documentation
 */

export const swaggerSchemas = {
  // Common Response Schemas
  ApiResponseSuccess: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        description: "Response data (varies by endpoint)",
      },
    },
  },
  ApiResponseError: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      error: {
        type: "string",
        description: "Error message",
      },
    },
  },

  GeoLocation: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        example: 7.0731,
      },
      longitude: {
        type: "number",
        example: 125.6124,
      },
      altitude: {
        type: "number",
        nullable: true,
        example: 12.3,
      },
      accuracy: {
        type: "number",
        nullable: true,
        example: 15.0,
      },
      source: {
        type: "string",
        example: "gps",
      },
    },
  },

  // Auth Schemas
  RegisterRequest: {
    type: "object",
    required: [
      "username",
      "email",
      "password",
      "firstName",
      "lastName",
      "address",
    ],
    properties: {
      username: {
        type: "string",
        description: "Unique username",
        example: "johndoe",
      },
      email: {
        type: "string",
        format: "email",
        description: "User email address",
        example: "john@example.com",
      },
      password: {
        type: "string",
        format: "password",
        minLength: 8,
        description: "Password (min 8 chars, must contain uppercase, " +
          "lowercase, number, and special character)",
        example: "SecurePass123!",
      },
      firstName: {
        type: "string",
        description: "Given name of the user",
        example: "John",
      },
      lastName: {
        type: "string",
        description: "Family name of the user",
        example: "Doe",
      },
      address: {
        type: "string",
        description: "Mailing or residential address",
        example: "123 Main St, City, Country",
      },
      phoneNumber: {
        type: "string",
        description: "Contact phone number (optional)",
        example: "+1234567890",
      },
      geo_location: {
        $ref: "#/components/schemas/GeoLocation",
        description: "Optional device-derived coordinates captured during signup.",
      },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: {
        type: "string",
        description: "Username or email of the user",
        example: "johndoe",
      },
      password: {
        type: "string",
        format: "password",
        description: "User password",
        example: "SecurePass123!",
      },
    },
  },
  LoginResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "string",
        example: "Successfully logged in!",
      },
    },
  },
  ChangePasswordRequest: {
    type: "object",
    required: ["oldPassword", "newPassword"],
    properties: {
      oldPassword: {
        type: "string",
        format: "password",
        description: "Current password",
      },
      newPassword: {
        type: "string",
        format: "password",
        minLength: 8,
        description: "New password",
      },
    },
  },

  // System Request Schemas
  SystemRequest: {
    type: "object",
    required: ["type", "message"],
    properties: {
      type: {
        type: "string",
        enum: ["feedback", "bug"],
        description: "Type of system request",
        example: "feedback",
      },
      message: {
        type: "string",
        description: "Detailed message describing the feedback or bug",
        example: "The dashboard loading time is too slow",
      },
      user_id: {
        type: "string",
        description: "User ID (optional, auto-populated if authenticated)",
        example: "abc123xyz",
      },
    },
  },
  SystemRequestResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "req123abc",
          },
          type: {
            type: "string",
            enum: ["feedback", "bug"],
            example: "feedback",
          },
          message: {
            type: "string",
            example: "The dashboard loading time is too slow",
          },
          user_id: {
            type: "string",
            example: "abc123xyz",
          },
        },
      },
    },
  },

  // Report Schemas
  Report: {
    type: "object",
    required: ["reporter_id", "reported_user_id", "reason"],
    properties: {
      reporter_id: {
        type: "string",
        description: "ID of the user making the report",
        example: "user123",
      },
      reported_user_id: {
        type: "string",
        description: "ID of the user being reported",
        example: "user456",
      },
      reason: {
        type: "string",
        enum: ["spam", "harassment", "inappropriate", "other"],
        description: "Reason for the report",
        example: "harassment",
      },
      details: {
        type: "string",
        description: "Additional details about the report (optional)",
        example: "User sent offensive messages",
      },
    },
  },
  ReportResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "report123",
          },
          reporter_id: {
            type: "string",
            example: "user123",
          },
          reported_user_id: {
            type: "string",
            example: "user456",
          },
          reason: {
            type: "string",
            example: "harassment",
          },
          details: {
            type: "string",
            example: "User sent offensive messages",
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 timestamp",
          },
        },
      },
    },
  },

  // Moldipedia Schemas
  Moldipedia: {
    type: "object",
    required: ["title", "body", "author_id"],
    properties: {
      title: {
        type: "string",
        description: "Article title",
        example: "Understanding Aspergillus",
      },
      body: {
        type: "string",
        description: "Article content (HTML or markdown)",
        example: "Aspergillus is a genus of fungi...",
      },
      author_id: {
        type: "string",
        description: "ID of the article author",
        example: "user123",
      },
      cover_photo: {
        type: "string",
        format: "uri",
        description: "Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.",
        example: "https://example.com/photo.jpg",
      },
      tags: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Article tags",
        example: ["fungi", "aspergillus", "health"],
      },
      mycologist_id: {
        type: "string",
        nullable: true,
        description: "ID of the mycologist who reviewed/approved this article",
        example: "mycologist456",
      },
      approved_at: {
        type: "string",
        format: "date-time",
        nullable: true,
        description: "Timestamp when the article was reviewed/approved",
        example: "2026-02-28T10:00:00.000Z",
      },
    },
  },
  MoldipediaResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "article123",
          },
          title: {
            type: "string",
            example: "Understanding Aspergillus",
          },
          body: {
            type: "string",
            example: "Aspergillus is a genus of fungi...",
          },
          author_id: {
            type: "string",
            example: "user123",
          },
          cover_photo: {
            type: "string",
            description: "Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.",
            example: "https://example.com/photo.jpg",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["fungi", "aspergillus", "health"],
          },
          mycologist_id: {
            type: "string",
            nullable: true,
            description: "ID of the mycologist who reviewed/approved this article",
            example: "mycologist456",
          },
          approved_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Timestamp when the article was reviewed/approved",
            example: "2026-02-28T10:00:00.000Z",
          },
        },
      },
    },
  },

  // User Schemas
  User: {
    type: "object",
    properties: {
      username: {
        type: "string",
        example: "johndoe",
      },
      role: {
        type: "string",
        enum: ["admin", "user", "mycologist", "curator"],
        example: "user",
      },
      first_name: {
        type: "string",
        example: "John",
      },
      last_name: {
        type: "string",
        example: "Doe",
      },
      address: {
        type: "string",
        example: "123 Main St",
      },
      geo_location: {
        $ref: "#/components/schemas/GeoLocation",
      },
      is_banned: {
        type: "boolean",
        example: false,
      },
    },
  },
  UserDetails: {
    type: "object",
    properties: {
      displayName: {
        type: "string",
        example: "John Doe",
      },
      email: {
        type: "string",
        format: "email",
        example: "john@example.com",
      },
      photo_url: {
        type: "string",
        format: "uri",
        description: "Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.",
        example: "https://example.com/avatar.jpg",
      },
      phone_number: {
        type: "string",
        example: "+1234567890",
      },
      disabled: {
        type: "boolean",
        example: false,
      },
    },
  },
  UserProfileUpdateRequest: {
    type: "object",
    properties: {
      username: {type: "string"},
      firstName: {type: "string"},
      lastName: {type: "string"},
      email: {type: "string", format: "email"},
      displayName: {type: "string"},
      address: {type: "string"},
      phoneNumber: {
        type: "string",
        description: "Philippine numbers are normalized to E.164 (+63...) before storage. Pass any local format (09XX, 639XX, +639XX).",
      },
      geo_location: {
        $ref: "#/components/schemas/GeoLocation",
      },
    },
  },
  APIUser: {
    type: "object",
    properties: {
      user: {
        $ref: "#/components/schemas/User",
      },
      details: {
        $ref: "#/components/schemas/UserDetails",
      },
      mycologist_details: {
        type: "object",
        nullable: true,
        properties: {
          user_id: {
            type: "string",
            example: "user123",
          },
          resume: {
            type: "string",
            example: "https://example.com/resume.pdf",
          },
          links: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["https://linkedin.com/in/johndoe"],
          },
        },
      },
    },
  },
  UserResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        $ref: "#/components/schemas/APIUser",
      },
    },
  },

  // Pagination Schemas
  PaginatedResult: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
            },
            description: "Array of results",
          },
          nextPageToken: {
            type: "string",
            nullable: true,
            description:
              "Opaque cursor token for fetching the next page. Pass as the `pageToken` " +
              "query parameter in the next request. Null when no further pages exist. " +
              "The internal format is base64-encoded JSON and must be treated as opaque.",
            example: "eyJsYXN0SWQiOiIxMjMifQ==",
          },
        },
      },
    },
  },

  // Mold Report Schemas
  MoldReport: {
    type: "object",
    required: [
      "case_name",
      "date_observed",
      "user_id",
      "case_details",
      "host",
      "location",
    ],
    properties: {
      case_name: {
        type: "string",
        description: "Name/title of the mold case",
        example: "Kitchen Wall Mold",
      },
      date_observed: {
        type: "string",
        format: "date-time",
        description: "ISO 8601 timestamp when mold was observed",
      },
      user_id: {
        type: "string",
        description: "ID of the user reporting the mold",
        example: "user123",
      },
      assigned_mycologist_id: {
        type: "string",
        nullable: true,
        description: "ID of assigned mycologist (if any)",
        example: "mycologist456",
      },
      case_details: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cover_photo: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Signed Google Cloud Storage URLs. Each URL is valid for 2 hours from the time of the response. Do not cache beyond that window.",
            },
            description: {
              type: "string",
              description: "Description of the mold case detail",
            },
          },
        },
      },
      host: {
        type: "string",
        description: "Host material/surface",
        example: "Drywall",
      },
      location: {
        type: "string",
        description: "Location where mold was found",
        example: "Kitchen wall near sink",
      },
      geo_location: {
        $ref: "#/components/schemas/GeoLocation",
        description: "Optional GPS metadata captured on the device.",
      },
      status: {
        type: "string",
        enum: ["pending", "in progress", "resolved", "rejected"],
        description: "Current status of the case",
        example: "pending",
      },
    },
  },

  // Email Schemas
  EmailRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "Email address",
        example: "user@example.com",
      },
    },
  },

  // Token Schemas
  TokenRequest: {
    type: "object",
    required: ["token"],
    properties: {
      token: {
        type: "string",
        description: "Authentication or verification token",
      },
    },
  },
  VerificationCodeRequest: {
    type: "object",
    required: ["email", "code"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      code: {
        type: "string",
        description: "Verification code",
        example: "123456",
      },
    },
  },
  VerifiedChangePasswordRequest: {
    type: "object",
    required: ["token", "newPassword"],
    properties: {
      token: {
        type: "string",
        description: "Verification token from email",
      },
      newPassword: {
        type: "string",
        format: "password",
        minLength: 8,
        description: "New password",
      },
    },
  },

  // ── Notification Schemas ─────────────────────────────────────────────────

  Notification: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Notification document ID",
        example: "aBcDeFgHiJkLmNoPqRsT",
      },
      recipient_id: {
        type: "string",
        description: "Firebase Auth UID of the recipient",
        example: "uSeRaUtHiDaBcDeFgHiJkLmNoPqR",
      },
      type: {
        type: "string",
        enum: [
          "mold_report_created",
          "mold_report_assigned",
          "mold_report_rejected",
          "mold_report_resolved",
          "case_detail_added",
          "flag_report_created",
          "flag_report_resolved",
          "curator_approved",
          "curator_rejected",
          "user_disabled",
          "user_enabled",
          "user_banned",
        ],
        description: "Notification event type",
        example: "mold_report_assigned",
      },
      title: {
        type: "string",
        description: "Notification headline",
        example: "Report Approved",
      },
      body: {
        type: "string",
        description: "Notification body text",
        example: "Your mold report 'Kitchen Mold' has been approved.",
      },
      reference_id: {
        type: "string",
        nullable: true,
        description: "ID of the related resource",
        example: "rEpOrTiDaBcDeFgHiJkL",
      },
      reference_type: {
        type: "string",
        nullable: true,
        enum: ["mold_report", "flag_report", "mold_case", "user"],
        description: "Type of the related resource",
        example: "mold_report",
      },
      is_read: {
        type: "boolean",
        description: "Whether the notification has been read",
        example: false,
      },
      metadata: {
        type: "object",
        properties: {
          created_at: {type: "string", format: "date-time"},
          updated_at: {type: "string", format: "date-time", nullable: true},
          deleted_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Non-null for soft-deleted notifications. These are not filtered server-side and may appear in list results.",
          },
        },
      },
    },
  },
  NotificationResponse: {
    type: "object",
    properties: {
      success: {type: "boolean", example: true},
      data: {$ref: "#/components/schemas/Notification"},
    },
  },
  NotificationListResponse: {
    type: "object",
    properties: {
      success: {type: "boolean", example: true},
      data: {
        type: "object",
        properties: {
          snapshot: {
            type: "array",
            items: {$ref: "#/components/schemas/Notification"},
          },
          nextPageToken: {
            type: "string",
            nullable: true,
            description:
              "Opaque cursor token for fetching the next page. Pass as the `pageToken` " +
              "query parameter in the next request. Null when no further pages exist. " +
              "The internal format is base64-encoded JSON and must be treated as opaque.",
            example: "eyJsYXN0SWQiOiIxMjMifQ==",
          },
        },
      },
    },
  },
  UnreadCountResponse: {
    type: "object",
    properties: {
      success: {type: "boolean", example: true},
      data: {
        type: "object",
        properties: {
          count: {type: "integer", example: 5},
        },
      },
    },
  },
  RegisterDeviceTokenRequest: {
    type: "object",
    required: ["token", "platform"],
    properties: {
      token: {
        type: "string",
        description: "FCM registration token",
        example: "dGhpcyBpcyBhIHNhbXBsZSBGQ00gdG9rZW4...",
      },
      platform: {
        type: "string",
        enum: ["android", "ios", "web"],
        description: "Platform that generated the token",
        example: "android",
      },
    },
  },
};
