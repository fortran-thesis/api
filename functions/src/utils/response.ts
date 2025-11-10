import {Response} from "express";
import {ApiResponse} from "../types/types";
import {devLog} from "./dev";

export const sendError = <T>(
  res: Response,
  error: T,
  status = 400
): Response => {
  const response: ApiResponse<T> = {success: false, error};
  devLog(response);
  return res.status(status).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  status = 200
): Response => {
  const response: ApiResponse<T> = {success: true, data};
  return res.status(status).json(response);
};

export const defaultError = (res: Response) => {
  const response: ApiResponse<string> = {
    success: false,
    error: "Something went wrong. An error has occurred.",
  };
  return res.status(500).json(response);
};
