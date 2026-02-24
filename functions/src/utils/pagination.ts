import {FieldPath, Timestamp} from "firebase-admin/firestore";
import {devLog} from "./dev";

/**
 * OrderField describes how the query is ordered; use FieldPath.documentId() as the last tiebreaker.
 * Example: ['created_at', FieldPath.documentId()]
 */
export type OrderField = string | FieldPath;

export interface GetPaginatedOptions {
  // apply where() / other constraints before ordering
  queryModifier?: (q: FirebaseFirestore.Query) => FirebaseFirestore.Query;
}

/**
 * Build a page token from the last document and the ordered fields used in the query.
 * The token is base64(JSON) of { vals: [...] } where each value is serializable.
 */
function makePageToken(
  lastDoc: FirebaseFirestore.DocumentSnapshot,
  orderFields: OrderField[],
): string {
  const vals = orderFields.map((f) => {
    // Check if field is the document ID
    const isDocId =
      f === FieldPath.documentId() ||
      (f instanceof FieldPath && f.toString().includes("__name__")) ||
      f === "__name__";

    if (isDocId) {
      return lastDoc.id;
    }

    // Handle string field names (including nested fields with dot notation)
    const fieldStr = f as string;
    let v = lastDoc.get(fieldStr);

    // If nested field access failed, try manual traversal
    if (v === undefined && fieldStr.includes(".")) {
      const parts = fieldStr.split(".");
      let current = lastDoc.data();
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = (current as any)[part];
        } else {
          current = undefined;
          break;
        }
      }
      v = current;
    }

    // Validate that we got a value
    if (v === undefined || v === null) {
      devLog(`[pagination] WARNING: Field '${fieldStr}' is undefined/null in document ${lastDoc.id}. This may cause pagination to fail.`);
      // Return a consistent fallback to avoid null values breaking pagination
      return null;
    }

    // Convert Timestamps to millis for portability
    if (v instanceof Timestamp) return v.toMillis();
    return v;
  });

  devLog(`[pagination] Creating token from fields: ${orderFields.join(", ")} -> values: ${JSON.stringify(vals)}`);
  const payload = {vals};
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Parse token -> array of values for query.startAfter(...)
 */
function parsePageToken(token?: string) {
  if (!token) return null;
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    const vals = parsed.vals ?? null;
    if (!vals) return null;

    // Reconstruct Timestamps from milliseconds
    const reconstructed = vals.map((v: any) => {
      // Skip null values (from deleted/missing fields)
      if (v === null) return null;

      // If it's a number that looks like a timestamp (milliseconds since epoch)
      if (typeof v === "number" && v > 1000000000000 && v < 9999999999999) {
        // Convert milliseconds back to Timestamp
        const seconds = Math.floor(v / 1000);
        const nanoseconds = (v % 1000) * 1000000;
        return new Timestamp(seconds, nanoseconds);
      }
      return v;
    });

    devLog(`[pagination] Parsed token, reconstructed values: ${JSON.stringify(reconstructed)}`);
    return reconstructed;
  } catch (err) {
    devLog(`[pagination] ERROR parsing token: ${err}`);
    return null;
  }
}

/**
 * Paginate an existing Query.
 * - query: pre-built Firestore Query with the same orderBy(...) clauses that correspond to orderFields.
 * - limit: page size
 * - token: optional base64 page token produced by makePageToken
 * - orderFields: array describing the fields used in orderBy in the same sequence (include FieldPath.documentId() last).
 *
 * Returns: { snapshot, nextPageToken } or null on error.
 *
 * IMPORTANT: The returned nextPageToken will be null ONLY when snap.empty or when we got fewer items than limit.
 * The frontend should detect the last page by checking if returned items < limit.
 */
export async function paginateQuery(
  query: FirebaseFirestore.Query,
  limit: number,
  token?: string,
  orderFields: OrderField[] = [FieldPath.documentId()],
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> {
  try {
    // Fetch limit + 1 so we know if there are more pages
    let q = query.limit(limit + 1);
    const vals = parsePageToken(token);

    if (vals && vals.length > 0) {
      // Validate that we have the correct number of values for startAfter
      if (vals.length !== orderFields.length) {
        devLog(`[pagination] WARNING: Token has ${vals.length} values but orderFields has ${orderFields.length}. Mismatch may cause pagination to fail.`);
      }

      // Ensure all values are non-null before calling startAfter
      const hasNull = vals.some((v: any) => v === null);
      if (hasNull) {
        devLog(`[pagination] WARNING: Token contains null values. This will likely cause pagination to fail. Values: ${JSON.stringify(vals)}`);
      }

      devLog(`[pagination] Applying startAfter with ${vals.length} values for token`);
      q = (q as any).startAfter(...vals);
    } else if (token) {
      devLog("[pagination] Token provided but could not parse it or it contained no values. Starting from beginning.");
    }

    const snap = await q.get();

    if (snap.empty) {
      devLog("[pagination] Query returned empty snapshot. No more pages.");
      return {snapshot: snap, nextPageToken: null};
    }

    // Check if we got more than the requested limit (which means there are more pages)
    const hasMorePages = snap.docs.length > limit;

    // Return only up to limit items
    const snapshotDocs = snap.docs.slice(0, limit);
    const last = snapshotDocs[snapshotDocs.length - 1];

    devLog(`[pagination] Got ${snapshotDocs.length} documents (queried for ${limit + 1}). HasMorePages: ${hasMorePages}. Last doc ID: ${last.id}`);

    // Return nextPageToken ONLY if there are more pages
    const nextPageToken = hasMorePages ? makePageToken(last, orderFields) : null;

    // Create a snapshot-like object with only the requested limit of documents
    const limitedSnap = {
      ...snap,
      docs: snapshotDocs,
      size: snapshotDocs.length,
    } as any;

    return {snapshot: limitedSnap, nextPageToken};
  } catch (err) {
    devLog("paginateQuery error: " + err);
    return null;
  }
}
