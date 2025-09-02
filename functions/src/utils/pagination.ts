import { FieldPath, Timestamp } from "firebase-admin/firestore";

/**
 * OrderField describes how the query is ordered; use FieldPath.documentId() as the last tiebreaker.
 * Example: ['created_at', FieldPath.documentId()]
 */
type OrderField = string | FieldPath;

/**
 * Build a page token from the last document and the ordered fields used in the query.
 * The token is base64(JSON) of { vals: [...] } where each value is serializable.
 */
function makePageToken(
  lastDoc: FirebaseFirestore.DocumentSnapshot,
  orderFields: OrderField[]
): string {
  const vals = orderFields.map((f) => {
    // If ordering by documentId, return the id
    if ((f as any) === FieldPath.documentId()) return lastDoc.id;
    const v = lastDoc.get(f as string);
    // Convert Timestamps to millis for portability
    if (v instanceof Timestamp) return v.toMillis();
    return v;
  });
  const payload = { vals };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Parse token -> array of values for query.startAfter(...)
 */
function parsePageToken(token?: string): any[] | null {
  if (!token) return null;
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    return parsed.vals ?? null;
  } catch {
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
 */
export async function paginateQuery(
  query: FirebaseFirestore.Query,
  limit: number,
  token?: string,
  orderFields: OrderField[] = [FieldPath.documentId()]
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> {
  try {
    let q = query.limit(limit);
    const vals = parsePageToken(token);
    if (vals && vals.length) {
      // startAfter expects the same number of ordering values as orderBy clauses
      q = (q as any).startAfter(...vals);
    }
    const snap = await q.get();
    if (snap.empty) {
      return { snapshot: snap, nextPageToken: null };
    }
    const last = snap.docs[snap.docs.length - 1];
    // If the query returned fewer than limit items, we still return a token if there is a last doc;
    // caller can inspect nextPageToken===null vs not to disable "load more".
    const nextPageToken = makePageToken(last, orderFields);
    return { snapshot: snap, nextPageToken };
  } catch (err) {
    // log/handle as you prefer
    console.error("paginateQuery error:", err);
    return null;
  }
}