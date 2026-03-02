import {
  addSubcollectionDocument,
  updateSubcollectionDocument,
  getSubcollectionDocumentById,
  getAllSubcollectionDocuments,
  deleteSubcollectionDocument,
  countSubcollectionDocuments,
} from "../lib/firestore";
import {MoldReportDetails} from "../types/types";
import {devLog} from "../utils/dev";
import {
  FirestoreCollection,
  FirestoreSubcollection,
  getCollectionName,
} from "../types/models/firestoreCollections";

const parentCollection = getCollectionName(FirestoreCollection.MOLD_REPORTS);
const subcollection = FirestoreSubcollection.CASE_DETAILS;

/**
 * Add a case detail document to the subcollection.
 */
export const addCaseDetail = async (
  reportId: string,
  detail: MoldReportDetails
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    return await addSubcollectionDocument(parentCollection, reportId, subcollection, detail);
  } catch (err) {
    devLog(err, "ADD_CASE_DETAIL_ERROR");
    return null;
  }
};

/**
 * Retrieve a single case detail by its document ID.
 */
export const findCaseDetailById = async (
  reportId: string,
  detailId: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    return await getSubcollectionDocumentById(parentCollection, reportId, subcollection, detailId);
  } catch (err) {
    devLog(err, "FIND_CASE_DETAIL_ERROR");
    return null;
  }
};

/**
 * Retrieve all case details for a report, ordered by creation date (asc).
 */
export const findAllCaseDetailsByReportId = async (
  reportId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> => {
  try {
    return await getAllSubcollectionDocuments(parentCollection, reportId, subcollection);
  } catch (err) {
    devLog(err, "FIND_ALL_CASE_DETAILS_ERROR");
    return [];
  }
};

/**
 * Delete a case detail document by ID.
 */
export const deleteCaseDetail = async (
  reportId: string,
  detailId: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await deleteSubcollectionDocument(parentCollection, reportId, subcollection, detailId);
  } catch (err) {
    devLog(err, "DELETE_CASE_DETAIL_ERROR");
    return null;
  }
};

/**
 * Count the total number of case details for a given report.
 */
export const countCaseDetailsByReportId = async (
  reportId: string
): Promise<number> => {
  try {
    return await countSubcollectionDocuments(parentCollection, reportId, subcollection);
  } catch (err) {
    devLog(err, "COUNT_CASE_DETAILS_ERROR");
    return 0;
  }
};

/**
 * Update a case detail document by ID.
 */
export const updateCaseDetail = async (
  reportId: string,
  detailId: string,
  updates: Partial<MoldReportDetails>
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await updateSubcollectionDocument<MoldReportDetails>(
      parentCollection,
      reportId,
      subcollection,
      detailId,
      updates
    );
  } catch (err) {
    devLog(err, "UPDATE_CASE_DETAIL_ERROR");
    return null;
  }
};
