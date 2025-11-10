import {FieldPath} from "firebase-admin/firestore";
import {getPaginatedDocuments, getDocumentsByField} from "../lib/firestore";
import {OrderField} from "../utils/pagination";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.AUDIT_LOGS);

export const findAuditLogsByAction = async (action: string) =>
  getDocumentsByField(collection, "action", action);

export const findAllAuditLogs = async (limit: number, token?: string, orderFields: OrderField[] = ["metadata.created_at", "actor_id", FieldPath.documentId()]) =>
  getPaginatedDocuments(collection, limit, token, orderFields);

