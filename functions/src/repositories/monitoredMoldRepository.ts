import {
  addDocument,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  getDocumentById,
} from "../lib/firestore";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";
import {MonitoredMold} from "../types/types";
import {GetPaginatedOptions, OrderField} from "../utils/pagination";

const collection = getCollectionName(FirestoreCollection.MONITORED_MOLDS);

export const addMonitoredMold = async (data: MonitoredMold) =>
  addDocument(collection, data);
export const findMonitoredMoldById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMonitoredMolds = async (
  limit: number,
  token?: string,
  orderFields?: OrderField[],
  options?: GetPaginatedOptions,
) => getPaginatedDocuments(collection, limit, token, orderFields, options);
export const updateMonitoredMold = async (
  uid: string,
  updatedData: Partial<MonitoredMold>
) => updateDocument(collection, uid, updatedData);
export const deleteMonitoredMold = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMonitoredMold = async (uid: string) =>
  softDeleteDocument(collection, uid);
