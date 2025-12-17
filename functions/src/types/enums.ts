export enum ReportReason {
  MISLEADING_DESCRIPTION = "misleading_description",
  OFFENSIVE_LANGUAGE = "offensive_language",
  INTELLECTUAL_PROPERTY = "intellectual_property",
  GRAPHIC_CONTENT = "graphic_content",
  SEXUAL_CONTENT = "sexual_content",
  RESTRICTED_CONTENT = "restricted_content",
  SOMETHING_ELSE = "something_else",
}
export enum Role {
  USER = "farmer",
  ADMIN = "admin",
  CURATOR = "mycologist",
}

export enum FeedbackStatus {
  PENDING = 0,
  REVIEWED = 1,
}

export enum PhotoSource {
  CAMERA = 0,
  UPLOAD = 1,
}

export enum AuditAction {
  // Generic CRUD Operations (use for generic resource operations)
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  SOFT_DELETE = "soft_delete",

  // Specific High-Impact Operations (security/compliance critical)
  PROFILE_UPDATE = "profile_update",
  IDENTIFY_MOLD = "identify_mold",
  ADD_MONITORING_FOLDER = "add_monitoring_folder",
  ADD_MOLD = "add_mold",
  EDIT_MOLD = "edit_mold",
  ADD_WIKIMOLD = "add_wikimold",
  EDIT_WIKIMOLD = "edit_wikimold",
  ARCHIVE_WIKIMOLD = "archive_wikimold",
  CORRECT_FLAG_REPORT = "correct_flag_report",
  DISABLE_USER = "disable_user",
  BAN_USER = "ban_user",
  APPROVE_CURATOR = "approve_curator",
  REJECT_CURATOR = "reject_curator",
  RESOLVE_REPORT = "resolve_report",

  // Additional Resource-Specific CRUD (use when you want clarity on entity type)
  CREATE_FAQ = "create_faq",
  UPDATE_FAQ = "update_faq",
  DELETE_FAQ = "delete_faq",
  SOFT_DELETE_FAQ = "soft_delete_faq",

  CREATE_FEEDBACK = "create_feedback",
  UPDATE_FEEDBACK = "update_feedback",
  DELETE_FEEDBACK = "delete_feedback",

  CREATE_CONTACT = "create_contact",
  UPDATE_CONTACT = "update_contact",
  DELETE_CONTACT = "delete_contact",
}
