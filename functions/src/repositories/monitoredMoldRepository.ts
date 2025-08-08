import {
  addDocument,
  getDocumentsByField,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { MonitoredMold } from "../types/types";

const collection = "monitored_molds";

export const addMonitoredMold = async (data: MonitoredMold) =>
  addDocument(collection, data);
export const findMonitoredMoldById = async (id: string) =>
  getDocumentsByField(collection, "folder_id", id);
export const findAllMonitoredMolds = async (
  id: string,
  limit: number,
  offset: number
) => getPaginatedDocuments(collection, limit, offset, "folder_id", id);
export const updateMonitoredMold = async (
  uid: string,
  updatedData: Partial<MonitoredMold>
) => updateDocument(collection, uid, updatedData);
export const deleteMonitoredMold = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMonitoredMold = async (uid: string) =>
  softDeleteDocument(collection, uid);
