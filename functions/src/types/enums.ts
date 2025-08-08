export enum Role {
  USER = "user",
  ADMIN = "admin",
  CURATOR = "curator",
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
}
