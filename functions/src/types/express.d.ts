import { APIUser, User, UserDetails, WithId } from "../types/types";
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: WithId<APIUser>;
    }
  }
}
