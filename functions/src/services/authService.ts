import { getAuth, UpdateRequest } from "firebase-admin/auth";
import { verifyToken, generateCookie } from "../lib/auth";
import { addUser } from "../repositories/userRepository";
import { Role } from "../types/enums";
import { ApiResponse, User, UserDetails } from "../types/types";
import { devLog } from "../utils/dev";
import { deleteDocument } from "../lib/firestore";

export const registerUser = async (
  email: string,
  password: string
): Promise<ApiResponse<string>> => {
  try {
    let userExists = false;
    try {
      await getAuth().getUserByEmail(email);
      userExists = true;
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') throw err;
    }
    if (userExists) return {success: false, error: "Email already used!"};

    const userRecord = await getAuth().createUser({
      email: email,
      emailVerified: false,
      password: password,
    });

    const userId = userRecord.uid;
    if (!userId) throw new Error("ID does not exist!");

    const user: User = {
      role: Role.USER,
    };

    const details = await addUser(user, userId);
    if (!details) throw new Error("Could not register user!");
    return {success: true, data: "Successfully created user!"};
  } catch (error) {
    devLog(error);
    return {success: false, error: "Registration failed"};
  }
};

export const authenticateUser = async (
  token: string
): Promise<string | null> => {
  try {
    const isVerified = verifyToken(token);
    if (!isVerified) throw new Error("Invalidated token.");
    return await generateCookie(token);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateUser = async (
  id: string,
  newDetails: UserDetails
): Promise<boolean> => {
  try {
    const update: UpdateRequest = {};
    if (newDetails.email !== undefined) update.email = newDetails.email;
    if (newDetails.displayName !== undefined)
      update.displayName = newDetails.displayName;

    const details = await getAuth().updateUser(id, newDetails);
    if (!details) throw new Error("Error updating user.");
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const removeUser = async (id: string): Promise<void> => {
  try {
    await getAuth().deleteUser(id);
    const process = await deleteDocument("users", id);
    if (!process) throw new Error("Error deleting user.");
  } catch (error) {
    devLog(error);
  }
};
