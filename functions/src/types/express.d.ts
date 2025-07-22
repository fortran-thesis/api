import { User, UserDetails } from "../types/types";
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: User & UserDetails;
    }
  }
}
