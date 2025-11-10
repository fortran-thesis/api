import {QuerySnapshot} from "firebase-admin/firestore";
import {queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  findAuditLogsByAction,
  findAllAuditLogs,
} from "../repositories/auditLogRepository";
import {AuditLogEntry, PaginatedResult} from "../types/types";

export const getAuditLogsByAction = async (
  action: string
): Promise<AuditLogEntry[] | null> => {
  try {
    const docs: QuerySnapshot | null = await findAuditLogsByAction(action);
    if (!docs) throw new Error("No audit logs found.");
    return queryToJson<AuditLogEntry>(docs);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getAllAuditLogs = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<AuditLogEntry[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllAuditLogs(
      limit,
      token
    );
    if (!docs) throw new Error("No audit logs found.");
    return {
      snapshot: queryToJson<AuditLogEntry>(docs.snapshot),
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};
