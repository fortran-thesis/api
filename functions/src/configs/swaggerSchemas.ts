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
            type: "object",
            description: "Timestamp object",
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
        description: "URL to the cover photo",
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
              "Token for the next page, null if no more pages",
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
        type: "object",
        description: "Timestamp when mold was observed",
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
              description: "URLs to photos",
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
};
