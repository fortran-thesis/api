import {Timestamp} from "firebase-admin/firestore";
import {documentToJson} from "../lib/firestore";
import {
  addCultureSession,
  findCultureSessionById,
  findCultureSessionsByCaseId,
  softDeleteCultureSession,
  updateCultureSession,
} from "../repositories/cultureSessionRepository";
import {
  CultureSession,
  CultureSessionStatus,
  PaginatedResult,
  WithId,
} from "../types/types";
import {devLog} from "../utils/dev";
import {normalizeResponseTimestamps} from "../utils/normalizeResponse";

export type CultureSessionItem = WithId<CultureSession> & {
  status: CultureSessionStatus;
  is_available_for_logs: boolean;
};

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as {toDate?: () => Date; _seconds?: number; seconds?: number};
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().getTime();
    }

    const seconds =
      typeof maybeTimestamp._seconds === "number" ?
        maybeTimestamp._seconds :
        typeof maybeTimestamp.seconds === "number" ?
          maybeTimestamp.seconds :
          null;

    if (seconds !== null) {
      return seconds * 1000;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  return 0;
};

const evaluateStatus = (session: CultureSession): CultureSessionStatus => {
  if (session.ended_at) return "ended_early";
  const nowMs = Date.now();
  const targetMs = toMillis(session.target_at);
  if (targetMs > 0 && targetMs <= nowMs) return "available";
  return "incubating";
};

const isAvailableForLogs = (status: CultureSessionStatus): boolean => {
  // Ended-early sessions are intentionally completed and must be selectable for logs.
  return status === "available" || status === "ended_early";
};

const toSessionItem = (raw: WithId<CultureSession>): CultureSessionItem => {
  const status = evaluateStatus(raw);
  return {
    ...raw,
    status,
    is_available_for_logs: isAvailableForLogs(status),
  };
};

export const listCultureSessionsByCase = async (
  caseId: string,
  limit = 100,
  pageToken?: string
): Promise<PaginatedResult<CultureSessionItem[]> | null> => {
  try {
    const result = await findCultureSessionsByCaseId(caseId, limit, pageToken);
    if (!result) return null;

    const sessions = result.docs
      .map((doc) => ({id: doc.id, ...doc.data()}) as WithId<CultureSession>)
      .map(toSessionItem);

    const sorted = sessions.sort((a, b) => {
      const aMillis = toMillis((a as any).metadata?.created_at);
      const bMillis = toMillis((b as any).metadata?.created_at);
      return bMillis - aMillis;
    });

    return {
      snapshot: normalizeResponseTimestamps(sorted),
      nextPageToken: result.nextPageToken,
    };
  } catch (error) {
    devLog(error, "LIST_CULTURE_SESSIONS_SERVICE_ERROR");
    return null;
  }
};

export const listAvailableCultureSessionsByCase = async (
  caseId: string
): Promise<CultureSessionItem[] | null> => {
  try {
    const all = await listCultureSessionsByCase(caseId, 200);
    if (!all) return null;

    return all.snapshot.filter((session) => session.is_available_for_logs);
  } catch (error) {
    devLog(error, "LIST_AVAILABLE_CULTURE_SESSIONS_SERVICE_ERROR");
    return null;
  }
};

export const createCultureSessionForCase = async (
  caseId: string,
  payload: {name: string; target_at: Timestamp}
): Promise<CultureSessionItem | null> => {
  try {
    const created = await addCultureSession(caseId, {
      case_id: caseId,
      name: payload.name,
      target_at: payload.target_at,
      ended_at: null,
      deleted_at: null,
    });

    if (!created) return null;

    const normalized = documentToJson<CultureSession>(created);
    return normalizeResponseTimestamps(toSessionItem(normalized));
  } catch (error) {
    devLog(error, "CREATE_CULTURE_SESSION_SERVICE_ERROR");
    return null;
  }
};

export const endCultureSessionEarlyForCase = async (
  caseId: string,
  cultureId: string
): Promise<CultureSessionItem | null> => {
  try {
    const existing = await findCultureSessionById(caseId, cultureId);
    if (!existing) return null;

    const data = existing.data() as CultureSession;
    if ((data as any)?.metadata?.deleted_at) return null;
    if (data.ended_at) {
      return normalizeResponseTimestamps(
        toSessionItem({id: existing.id, ...data} as WithId<CultureSession>)
      );
    }

    const updated = await updateCultureSession(caseId, cultureId, {
      ended_at: Timestamp.now(),
    });
    if (!updated) return null;

    const refreshed = await findCultureSessionById(caseId, cultureId);
    if (!refreshed) return null;

    return normalizeResponseTimestamps(
      toSessionItem({id: refreshed.id, ...refreshed.data()} as WithId<CultureSession>)
    );
  } catch (error) {
    devLog(error, "END_CULTURE_SESSION_SERVICE_ERROR");
    return null;
  }
};

export const reassignCultureSessionForCase = async (
  caseId: string,
  cultureId: string,
  payload: {target_at: Timestamp}
): Promise<CultureSessionItem | null> => {
  try {
    const existing = await findCultureSessionById(caseId, cultureId);
    if (!existing) return null;

    const data = existing.data() as CultureSession;
    if ((data as any)?.metadata?.deleted_at) return null;

    const updated = await updateCultureSession(caseId, cultureId, {
      target_at: payload.target_at,
      ended_at: null,
    });
    if (!updated) return null;

    const refreshed = await findCultureSessionById(caseId, cultureId);
    if (!refreshed) return null;

    return normalizeResponseTimestamps(
      toSessionItem({id: refreshed.id, ...refreshed.data()} as WithId<CultureSession>)
    );
  } catch (error) {
    devLog(error, "REASSIGN_CULTURE_SESSION_SERVICE_ERROR");
    return null;
  }
};

export const deleteCultureSessionForCase = async (
  caseId: string,
  cultureId: string
): Promise<boolean> => {
  try {
    const result = await softDeleteCultureSession(caseId, cultureId);
    return !!result;
  } catch (error) {
    devLog(error, "DELETE_CULTURE_SESSION_SERVICE_ERROR");
    return false;
  }
};
