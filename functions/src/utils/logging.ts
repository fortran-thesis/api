import { Timestamp } from "firebase-admin/firestore";
import { AuditAction, Role } from "../types/enums";
import { AuditLogEntry } from "../types/types";
import { devLog } from "./dev";
import { addDocument } from "../lib/firestore";

/**
 * Computes the difference between two objects.
 * Returns an object with keys for each changed field, and values as { old, new }.
 */
export function computeDiff<T extends object>(oldData: T, newData: T): Record<string, { old: any, new: any }> {
  const diff: Record<string, { old: any, new: any }> = {};
  for (const key of Object.keys(newData) as Array<keyof T>) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff[String(key)] = { old: oldData[key], new: newData[key] };
    }
  }
  return diff;
}

export const createLog = async (id: string, role: Role, type: AuditAction, details: string, targetId: string) => {
  try {
    const logEntry: AuditLogEntry = {
      actor_id: id,
      actor_role: role,
      action: type,
      description: details,
      timestamp: Timestamp.now(),
      target_id: targetId,
    };

    await addDocument('audit_logs', logEntry);
  } catch (error) {
    devLog(error);
    // Optionally: send to backup log, alert, etc.
  }
} 