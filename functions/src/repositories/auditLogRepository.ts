import { getPaginatedDocuments, getDocumentsByField } from "../lib/firestore";

const collection = "audit_logs";

export const findAuditLogsByAction = async (action: string) =>
  getDocumentsByField(collection, "action", action);

export const findAllAuditLogs = async (limit: number, offset: number) =>
  getPaginatedDocuments(collection, limit, offset);

