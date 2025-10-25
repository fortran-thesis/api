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
  SYSTEM_REQUESTS = "system_requests"
}

export function getCollectionName(collection: FirestoreCollection): string {
  return collection;
}
