import { QuerySnapshot } from "firebase-admin/firestore";
import { queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import { findAllMolds, findMoldById, findMoldByName } from "../repositories/moldRepository";
import { Mold } from "../types/types";

export const retrieveAllMolds = async (limit: number, offset: number): Promise<Mold[] | null> => {
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
