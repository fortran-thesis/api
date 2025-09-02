import {
  addDocument,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  getDocumentById,
} from "../lib/firestore";
import { MonitoredMold } from "../types/types";
import { GetPaginatedOptions, OrderField } from "../utils/pagination";

const collection = "monitored_molds";

export const addMonitoredMold = async (data: MonitoredMold) =>
  addDocument(collection, data);
export const findMonitoredMoldById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMonitoredMolds = async (
  id: string,
  limit: number,
  orderFields: OrderField[],
  options: GetPaginatedOptions,
  token?: string,
) => getPaginatedDocuments(collection, limit, token, orderFields, options);
export const updateMonitoredMold = async (
  uid: string,
  updatedData: Partial<MonitoredMold>
) => updateDocument(collection, uid, updatedData);
export const deleteMonitoredMold = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMonitoredMold = async (uid: string) =>
  softDeleteDocument(collection, uid);
