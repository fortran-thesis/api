import {Timestamp} from "firebase-admin/firestore";
import {getDb} from "../lib/firestore";
import {CultureSession, WithMetadata} from "../types/types";
import {
  FirestoreCollection,
  FirestoreSubcollection,
  getCollectionName,
} from "../types/models/firestoreCollections";
import {devLog} from "../utils/dev";

const parentCollection = getCollectionName(FirestoreCollection.MOLD_CASES);
const subcollection = FirestoreSubcollection.CULTURE_SESSIONS;

const sessionsRef = (caseId: string) =>
  getDb().collection(parentCollection).doc(caseId).collection(subcollection);

export const addCultureSession = async (
  caseId: string,
  session: CultureSession
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const withMetadata: WithMetadata<CultureSession> = {
      ...session,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const docRef = await sessionsRef(caseId).add(withMetadata);
    return {
      id: docRef.id,
      exists: true,
      ref: docRef,
      data: () => withMetadata,
    } as unknown as FirebaseFirestore.DocumentSnapshot;
  } catch (err) {
    devLog(err, "ADD_CULTURE_SESSION_ERROR");
    return null;
  }
};

export const findCultureSessionsByCaseId = async (
  caseId: string,
  limit = 100,
  token?: string
): Promise<{
  docs: FirebaseFirestore.QueryDocumentSnapshot[];
  nextPageToken: string | null;
} | null> => {
  try {
    let query: FirebaseFirestore.Query = sessionsRef(caseId)
      .where("metadata.deleted_at", "==", null)
      .orderBy("metadata.created_at", "desc")
      .limit(limit + 1);

    if (token) {
      const startDoc = await sessionsRef(caseId).doc(token).get();
      if (startDoc.exists) {
        query = sessionsRef(caseId)
          .where("metadata.deleted_at", "==", null)
          .orderBy("metadata.created_at", "desc")
          .startAfter(startDoc)
          .limit(limit + 1);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limit);
    const nextPageToken =
      snapshot.docs.length > limit && docs.length > 0 ? docs[docs.length - 1].id : null;

    return {docs, nextPageToken};
  } catch (err) {
    devLog(err, "FIND_CULTURE_SESSIONS_ERROR");
    return null;
  }
};

export const findCultureSessionById = async (
  caseId: string,
  cultureId: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const doc = await sessionsRef(caseId).doc(cultureId).get();
    if (!doc.exists) return null;
    return doc;
  } catch (err) {
    devLog(err, "FIND_CULTURE_SESSION_ERROR");
    return null;
  }
};

export const updateCultureSession = async (
  caseId: string,
  cultureId: string,
  updates: Partial<CultureSession>
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const docRef = sessionsRef(caseId).doc(cultureId);
    const existing = await docRef.get();
    if (!existing.exists) return null;

    return await docRef.update({
      ...updates,
      "metadata.updated_at": Timestamp.now(),
    });
  } catch (err) {
    devLog(err, "UPDATE_CULTURE_SESSION_ERROR");
    return null;
  }
};

export const softDeleteCultureSession = async (
  caseId: string,
  cultureId: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const docRef = sessionsRef(caseId).doc(cultureId);
    const existing = await docRef.get();
    if (!existing.exists) return null;

    return await docRef.update({
      "metadata.deleted_at": Timestamp.now(),
      "metadata.updated_at": Timestamp.now(),
    });
  } catch (err) {
    devLog(err, "SOFT_DELETE_CULTURE_SESSION_ERROR");
    return null;
  }
};
