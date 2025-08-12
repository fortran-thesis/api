import { QuerySnapshot } from "firebase-admin/firestore";
import { queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import { findAuditLogsByAction, findAllAuditLogs } from "../repositories/auditLogRepository";
import { AuditLogEntry } from "../types/types";

export const getAuditLogsByAction = async (action: string): Promise<AuditLogEntry[] | null> => {
  try {
    const docs: QuerySnapshot | null = await findAuditLogsByAction(action);
    if (!docs) throw new Error("No audit logs found.");
    return queryToJson<AuditLogEntry>(docs);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getAllAuditLogs = async (limit: number, offset: number): Promise<AuditLogEntry[] | null> => {
  try {
    const docs: QuerySnapshot | null = await findAllAuditLogs(limit, offset);
    if (!docs) throw new Error("No audit logs found.");
    return queryToJson<AuditLogEntry>(docs);
  } catch (error) {
    devLog(error);
    return null;
  }
};
