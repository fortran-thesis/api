import { Response } from "express";
import { ApiResponse } from "../types/types";

export const sendError = <T>(
  res: Response,
  error: T,
  status: number = 400
): Response => {
  const response: ApiResponse<T> = { success: false, error };
  return res.status(status).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  status: number = 200
): Response => {
  const response: ApiResponse<T> = { success: true, data };
  return res.status(status).json(response);
};

export const defaultError = (res: Response) => {
  const response: ApiResponse<string> = {
    success: false,
    error: "Something went wrong. An error has occurred.",
  };
  return res.status(500).json(response);
};
