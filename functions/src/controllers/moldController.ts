import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";

export const createMold = async (req: Request, res: Response) => {

}

export const getAllMolds = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
}

export const getMoldById = async (req: Request, res: Response) => {

}

export const getMoldByName = async (req: Request, res: Response) => {

}

export const patchMold = async (req: Request, res: Response) => {

}

export const deleteMold = async (req: Request, res: Response) => {

}