import { DecodedIdToken, getAuth, UpdateRequest } from "firebase-admin/auth";
import {
  verifyToken,
  generateCookie,
  getAuthUserById,
  getAuthUserByEmail,
} from "../lib/auth";
import {
  addUser,
  deleteFirestoreUser,
  findFirestoreUserById,
  softDeleteFirestoreUser,
  updateFirestoreUser,
} from "../repositories/userRepository";
import { Role } from "../types/enums";
import {
  ApiResponse,
  APIUser,
  User,
  UserDetails,
  WithId,
  WithMetadata,
} from "../types/types";
import { devLog } from "../utils/dev";
import { Timestamp } from "firebase-admin/firestore";
import { sendEmail } from "../utils/email";
import { getDocumentIdByField } from "../lib/firestore";
import { redis } from "../configs/redis";
import { redisReady } from "../configs/redis";
import { generateCode } from "../utils/code";
import { v4 as uuidv4 } from "uuid";

export const registerUser = async (
  username: string,
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
      username: username,
      role: Role.USER,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const details = await addUser(user, userId);
    if (!details) throw new Error("Could not register user!");
    return { success: true, data: "Successfully created user!" };
  } catch (error) {
    devLog(error);
    return { success: false, error: "Registration failed" };
  }
};

export const registerOAuthUser = async (
  uid: string
): Promise<ApiResponse<string>> => {
  try {
    let userExists = false;
    try {
      await getAuth().getUser(uid);
      userExists = true;
    } catch (err: any) {
      if (err.code !== "auth/user-not-found") throw err;
    }
    if (userExists) return { success: false, error: "User already exists!" };

    const user: WithMetadata<User> = {
      username: "",
      role: Role.USER,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const details = await addUser(user, uid);
    if (!details) throw new Error("Could not register user!");
    return {
      success: true,
      data: "Successfully created user in Firebase Firestore!",
    };
  } catch (error) {
    devLog(error);
    return {
      success: false,
      error: "Failed to register OAuth user in Firebase Firestore!",
    };
  }
};

export const identifyUser = async (
  username: string,
  password: string
): Promise<string | null> => {
  try {
    const uid: string | null = await getDocumentIdByField(
      "users",
      "username",
      username
    );
    if (!uid) throw new Error("UID not found in Firebase Firestore.");
    const user = await getAuthUserById(uid);
    if (!user) throw new Error("User not found in Firebase Authentication");
    const result = await fetch(process.env.FIREBASE_AUTH_API as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.details.email,
        password: password,
        returnSecureToken: true,
      }),
    });
    if (!result.ok) throw new Error("Firebase Auth API doesn't recognize user");
    const obtainedUser = await result.json();
    return obtainedUser.idToken;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const authenticateUser = async (
  token: string
): Promise<string | null> => {
  try {
    const user: WithId<APIUser> | null = await verifyToken(token);
    if (!user) throw new Error("Invalidated token for user.");
    return await generateCookie(token);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const identifyOAuthUser = async (
  token: string
): Promise<string | null> => {
  try {
    const decodedToken: DecodedIdToken = await getAuth().verifyIdToken(token);
    if (!decodedToken) throw new Error("Invalidated token for user.");
    return decodedToken.uid;
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
    const updateMetadata = await updateFirestoreUser(id, {});

    if (!details) throw new Error("Error updating user in Firebase Auth.");
    if (!updateMetadata)
      throw new Error("Error updating user metadata in Firestore.");
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveUser = async (id: string): Promise<void> => {
  try {
    await getAuth().updateUser(id, { disabled: true });
    const process = await softDeleteFirestoreUser(id);
    if (!process) throw new Error("Error deleting user.");
  } catch (error) {
    devLog(error);
  }
};

export const removeUser = async (id: string): Promise<void> => {
  try {
    await getAuth().deleteUser(id);
    const process = await deleteFirestoreUser(id);
    if (!process) throw new Error("Error deleting user.");
  } catch (error) {
    devLog(error);
  }
};

export const generateVerificationCode = async (
  email: string
): Promise<string> => {
  try {
    // Generate a random 4-digit code, zero-padded (e.g., '0004', '0348')
    const code = generateCode();
    // Ensure Redis connection is ready
    await redisReady;
    // Store in Redis with a TTL (e.g., 10 minutes)
    await redis.set(`verify:${email}`, code, { EX: 600 });
    return code;
  } catch (error) {
    devLog(error);
    return `Something went wrong`;
  }
};

export const checkVerificationCode = async (
  email: string,
  code: string
): Promise<string | null> => {
  try {
    await redisReady;
    const storedCode = await redis.get(`verify:${email}`);
    if (!storedCode || storedCode !== code) return null;
    await redis.del(`verify:${email}`);
    const token = uuidv4();
    await redis.set(`token:${token}`, email, { EX: 1800 }); // 30 min TTL

    return token;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const sendVerificationCode = async (email: string): Promise<string> => {
  try {
    // Generate and store code
    const code = await generateVerificationCode(email);
    // Compose email
    const html = `
      <h2>Your Verification Code</h2>
      <p>Hello,</p>
      <p>Account: <strong>${email}</strong></p>
      <p>Your verification code is:</p>
      <div style="font-size:2em;font-weight:bold;letter-spacing:0.2em;background:#f5f5f5;padding:10px;border-radius:6px;width:max-content;">${code}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `;
    await sendEmail(email, "Your Verification Code", html);
    return `Verification code sent to ${email}`;
  } catch (error) {
    devLog(error);
    return `Something went wrong sending verification code`;
  }
};

export const changePassword = async (
  redisToken: string,
  newPassword: string
): Promise<ApiResponse<string>> => {
  try {
    await redisReady;
    const email = await redis.get(`token:${redisToken}`);
    if (!email) return { success: false, data: "Invalid or expired token!" };
    const user = await getAuthUserByEmail(email);
    if (!user) return { success: false, data: "Something went wrong." };
    await getAuth().updateUser(user.id, { password: newPassword });
    await redis.del(`token:${redisToken}`);
    const check = await redis.get(`token:${redisToken}`);
    console.log(check);
    return { success: true, data: "Password changed successfully!" };
  } catch (error) {
    devLog(error);
    return { success: false, data: "Something went wrong." };
  }
};

export const forgetUsername = async (
  redisToken: string
): Promise<ApiResponse<string>> => {
  try {
    await redisReady;
    const email = await redis.get(`token:${redisToken}`);
    if (!email) return { success: false, data: "Invalid or expired token!" };
    const uid = await getDocumentIdByField("users", "email", email);
    if (!uid) throw new Error("No user found in Firebase Firestore");
    // You may need to fetch user details from Firestore
    const querySnap = await findFirestoreUserById(uid);
    const user = querySnap?.docs[0].data();
    if (!user) throw new Error("No user found in Firebase Firestore");
    const html = `
      <h2>Username</h2>
      <p>Hello,</p>
      <p>Account: <strong>${email}</strong></p>
      <p>This is your username:</p>
      <div style="font-size:2em;font-weight:bold;letter-spacing:0.2em;background:#f5f5f5;padding:10px;border-radius:6px;width:max-content;">${user.username}</div>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `;
    sendEmail(email, "Forgot Username", html);
    await redis.del(`token:${redisToken}`);
    return { success: true, data: "Successfully sent email." };
  } catch (error) {
    devLog(error);
    return { success: false, data: "Something went wrong" };
  }
};

export const checkUserChangePassword = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    const result = await fetch(process.env.FIREBASE_AUTH_API as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true,
      }),
    });
    if (!result.ok) throw new Error("Firebase Auth API doesn't recognize user");
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};
