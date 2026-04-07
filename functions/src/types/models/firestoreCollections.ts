export enum FirestoreCollection {
  USERS = "users",
  AUDIT_LOGS = "audit_logs",
  FLAG_REPORTS = "flag_reports",
  MOLD_CASES = "mold_cases",
  MOLD_REPORTS = "mold_reports",
  INVESTIGATIONS = "investigations",
  MOLDIPEDIA = "moldipedia",
  MOLDS = "molds",
  MONITORED_MOLDS = "monitored_molds",
  REPORTS = "reports",
  SCANNED_MOLDS = "scanned_molds",
  SYSTEM_REQUESTS = "system_requests",
  FAQ = "faq",
  NOTIFICATIONS = "notifications"
}

/**
 * Subcollection names used under parent documents.
 * Path examples:
 *   mold_cases/{caseId}/cultivation_logs
 *   mold_reports/{reportId}/case_details
 */
export enum FirestoreSubcollection {
  CULTIVATION_LOGS = "cultivation_logs",
  CULTURE_SESSIONS = "culture_sessions",
  CASE_DETAILS = "case_details",
  DEVICE_TOKENS = "device_tokens",
}

export function getCollectionName(collection: FirestoreCollection): string {
  return collection;
}
