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

export enum AuditAction {
  // ── User management ────────────────────────────────────────────────────────
  PROFILE_UPDATE = "profile_update",
  UPDATE_USER = "update_user",
  DISABLE_USER = "disable_user",
  ENABLE_USER = "enable_user",
  BAN_USER = "ban_user",

  // ── Mold catalogue ─────────────────────────────────────────────────────────
  ADD_MOLD = "add_mold",
  EDIT_MOLD = "edit_mold",
  DELETE_MOLD = "delete_mold",
  SOFT_DELETE_MOLD = "soft_delete_mold",

  // ── Mold scanning ──────────────────────────────────────────────────────────
  IDENTIFY_MOLD = "identify_mold",
  UPDATE_SCANNED_MOLD = "update_scanned_mold",
  DELETE_SCANNED_MOLD = "delete_scanned_mold",
  SOFT_DELETE_SCANNED_MOLD = "soft_delete_scanned_mold",

  // ── Mold monitoring ────────────────────────────────────────────────────────
  ADD_MONITORING_FOLDER = "add_monitoring_folder",
  ADD_MONITORING_IMAGE = "add_monitoring_image",

  // ── Moldipedia (wiki) ──────────────────────────────────────────────────────
  ADD_WIKIMOLD = "add_wikimold",
  EDIT_WIKIMOLD = "edit_wikimold",
  DELETE_WIKIMOLD = "delete_wikimold",
  SOFT_DELETE_WIKIMOLD = "soft_delete_wikimold", ARCHIVE_WIKIMOLD = "archive_wikimold",
  UNARCHIVE_WIKIMOLD = "unarchive_wikimold",
  // ── Mold reports (crop infestation reports) ────────────────────────────────
  CREATE_MOLD_REPORT = "create_mold_report",
  UPDATE_MOLD_REPORT = "update_mold_report",
  ASSIGN_MOLD_REPORT = "assign_mold_report",
  REJECT_MOLD_REPORT = "reject_mold_report",
  RESOLVE_MOLD_REPORT = "resolve_mold_report",
  DELETE_MOLD_REPORT = "delete_mold_report",
  SOFT_DELETE_MOLD_REPORT = "soft_delete_mold_report",

  // ── Mold cases (mycologist investigations) ─────────────────────────────────
  CREATE_MOLD_CASE = "create_mold_case",
  UPDATE_MOLD_CASE = "update_mold_case",
  DELETE_MOLD_CASE = "delete_mold_case",
  SOFT_DELETE_MOLD_CASE = "soft_delete_mold_case",
  ADD_CULTIVATION_LOG = "add_cultivation_log",
  ANALYZE_CULTIVATION = "analyze_cultivation",

  // ── User-to-user reports (misconduct) ──────────────────────────────────────
  CREATE_REPORT = "create_report",
  UPDATE_REPORT = "update_report",
  DELETE_REPORT = "delete_report",
  SOFT_DELETE_REPORT = "soft_delete_report",

  // ── Flag reports (content moderation) ─────────────────────────────────────
  CREATE_FLAG_REPORT = "create_flag_report",
  CORRECT_FLAG_REPORT = "correct_flag_report",
  DELETE_FLAG_REPORT = "delete_flag_report",
  SOFT_DELETE_FLAG_REPORT = "soft_delete_flag_report",

  // ── System requests ────────────────────────────────────────────────────────
  CREATE_SYSTEM_REQUEST = "create_system_request",
  UPDATE_SYSTEM_REQUEST = "update_system_request",
  DELETE_SYSTEM_REQUEST = "delete_system_request",
  SOFT_DELETE_SYSTEM_REQUEST = "soft_delete_system_request",

  // ── FAQ ────────────────────────────────────────────────────────────────────
  CREATE_FAQ = "create_faq",
  UPDATE_FAQ = "update_faq",
  DELETE_FAQ = "delete_faq",
  SOFT_DELETE_FAQ = "soft_delete_faq",

  // ── Legacy / kept for backwards compatibility with stored audit log values ──
  /** @deprecated Use ASSIGN_MOLD_REPORT */
  APPROVE_CURATOR = "approve_curator",
  /** @deprecated Use REJECT_MOLD_REPORT */
  REJECT_CURATOR = "reject_curator",
  /** @deprecated Use RESOLVE_MOLD_REPORT */
  RESOLVE_REPORT = "resolve_report",
  /** @deprecated Use SOFT_DELETE_WIKIMOLD */
  // ARCHIVE_WIKIMOLD preserved as ARCHIVE_WIKIMOLD above
}
