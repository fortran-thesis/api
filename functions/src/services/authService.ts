import { getAuth, UpdateRequest } from "firebase-admin/auth";
import { verifyToken, generateCookie } from "../lib/auth";
import { addUser, deleteFirestoreUser, softDeleteFirestoreUser, updateFirestoreUser } from "../repositories/userRepository";
import { Role } from "../types/enums";
import { ApiResponse, User, UserDetails, WithMetadata } from "../types/types";
import { devLog } from "../utils/dev";
import { Timestamp } from "firebase-admin/firestore";

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
      if (err.code !== "auth/user-not-found") throw err;
    }
    if (userExists) return { success: false, error: "Email already used!" };

    const userRecord = await getAuth().createUser({
      email: email,
      emailVerified: false,
      password: password,
    });

    const userId = userRecord.uid;
    if (!userId) throw new Error("ID does not exist!");

    const user: WithMetadata<User> = {
      role: Role.USER,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null
      }
    };

    const details = await addUser(user, userId);
    if (!details) throw new Error("Could not register user!");
    return { success: true, data: "Successfully created user!" };
  } catch (error) {
    devLog(error);
    return { success: false, error: "Registration failed" };
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
    const updateMetadata = await updateFirestoreUser(id, {})

    if (!details) throw new Error("Error updating user in Firebase Auth.");
    if (!updateMetadata) throw new Error("Error updating user metadata in Firestore.");
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveUser = async (id: string): Promise<void> => {
  try {
    await getAuth().updateUser(id, {disabled: true})
    const process = await softDeleteFirestoreUser(id);
    if (!process) throw new Error("Error deleting user.");
  } catch (error) {
    devLog(error);
  }
}

export const removeUser = async (id: string): Promise<void> => {
  try {
    await getAuth().deleteUser(id);
    const process = await deleteFirestoreUser(id);
    if (!process) throw new Error("Error deleting user.");
  } catch (error) {
    devLog(error);
  }
};

export const changePassword = async (email: string) => {
  const link = await getAuth().generatePasswordResetLink(email)
}

export const verifyEmail = async (email: string) => {
  const link = await getAuth().generateEmailVerificationLink(email)
}

export const changeEmail = async (oldEmail: string, newEmail: string) => {
  const link = await getAuth().generateVerifyAndChangeEmailLink(oldEmail, newEmail)
}
