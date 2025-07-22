import {
  DocumentSnapshot,
  QuerySnapshot,
  WriteResult,
} from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addMold,
  deleteMold,
  findAllMolds,
  findMoldById,
  findMoldByName,
  updateMold,
} from "../repositories/moldRepository";
import { Mold } from "../types/types";

export const addMoldToFirestore = async (
  details: Mold
): Promise<Mold | null> => {
  try {
    const mold: DocumentSnapshot | null = await addMold(details);
    if (!mold) throw new Error("Cannot add mold.");
    return documentToJson<Mold>(mold);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMolds = async (
  limit: number,
  offset: number
): Promise<Mold[] | null> => {
  try {
    const molds: QuerySnapshot | null = await findAllMolds(limit, offset);
    if (!molds) throw new Error("No users found.");
    return queryToJson<Mold>(molds);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldById = async (id: string): Promise<Mold | null> => {
  try {
    const mold: QuerySnapshot | null = await findMoldById(id);
    if (!mold) throw new Error("No mold found.");
    const molds = queryToJson<Mold>(mold);
    return molds.length > 0 ? molds[0] : null;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldByName = async (
  name: string
): Promise<Mold | null> => {
  try {
    const mold: QuerySnapshot | null = await findMoldByName(name);
    if (!mold) throw new Error("No user found.");
    const molds = queryToJson<Mold>(mold);
    return molds.length > 0 ? molds[0] : null;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldInFirestore = async (
  id: string,
  details: Partial<Mold>
): Promise<Mold | null> => {
  try {
    const result: WriteResult | null = await updateMold(id, details);
    if (!result) throw new Error("Failed to update mold.");
    const updatedMold = await retrieveMoldById(id);
    return updatedMold;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const removeMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMold(id);
    if (!result) throw new Error("Failed to delete mold");
  } catch (error) {
    devLog(error);
  }
};
