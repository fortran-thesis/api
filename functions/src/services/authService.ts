import {DecodedIdToken, getAuth, UpdateRequest} from "firebase-admin/auth";
import {
  verifyToken,
  generateCookie,
  getAuthUserById,
  getAuthUserByEmail,
} from "../lib/auth";
import {
  addUser,
  deleteFirestoreUser,
  softDeleteFirestoreUser,
  updateFirestoreUser,
} from "../repositories/userRepository";
import {Role} from "../types/enums";
import {
  ApiResponse,
  APIUser,
  User,
  UserDetails,
  WithId,
  WithMetadata,
} from "../types/types";
import {devLog} from "../utils/dev";
import {Timestamp} from "firebase-admin/firestore";
import {sendEmail} from "../utils/email";
import {getDocumentIdByField} from "../lib/firestore";
import {ensureRedisConnection} from "../configs/redis";
import {generateCode} from "../utils/code";
import {v4 as uuidv4} from "uuid";
import {
  handlePostCache,
  handlePatchCache,
  handleDeleteCache,
} from "../utils/cacheManager";
import {envOptions} from "../configs/environment";

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  address: string,
  phoneNumber?: string,
  role: Role = Role.USER
): Promise<ApiResponse<string>> => {
  try {
    // Normalize Philippine phone numbers to E.164 (+63...) expected by Firebase
    const normalizePH = (raw?: string): string | undefined => {
      if (!raw) return undefined;
      let p = raw.trim();
      // remove common separators
      p = p.replace(/[^0-9+]/g, "");
      // If already in E.164 and starts with +63, accept
      if (p.startsWith("+63")) return p;
      // If starts with + but not +63, leave as-is (assume user provided full international)
      if (p.startsWith("+")) return p;
      // If starts with 63 (no plus), add +
      if (p.startsWith("63")) return `+${p}`;
      // If starts with 0 (local Philippine), replace leading 0 with +63
      if (p.startsWith("0")) return `+63${p.slice(1)}`;
      // Otherwise assume it's a local number without 0/prefix; prepend +63
      return `+63${p}`;
    };

    const normalizedPhone = normalizePH(phoneNumber);
    let userExists = false;
    try {
      await getAuth().getUserByEmail(email);
      userExists = true;
    } catch (err: any) {
      if (err.code !== "auth/user-not-found") throw err;
    }
    if (userExists) return {success: false, error: "Email already used!"};

    const userRecord = await getAuth().createUser({
      email: email,
      emailVerified: false,
      password: password,
      phoneNumber: normalizedPhone,
      displayName: firstName + " " + lastName,
    });

    const userId = userRecord.uid;
    if (!userId) throw new Error("ID does not exist!");
    const user: WithMetadata<User> = {
      username: username,
      first_name: firstName,
      last_name: lastName,
      address: address,
      role: role,
      is_banned: false,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const details = await addUser(user, userId);
    if (!details) throw new Error("Could not register user!");

    // Invalidate user list caches (new user added)
    await handlePostCache("users");

    return {success: true, data: "Successfully created user!"};
  } catch (error) {
    devLog(error);
    return {success: false, error: "Registration failed"};
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
    if (userExists) {
      // User already exists, treat as success
      return {
        success: true,
        data: "User already exists in Firebase Auth.",
      };
    }

    const user: WithMetadata<User> = {
      username: "",
      first_name: "",
      last_name: "",
      address: "",
      role: Role.USER,
      is_banned: false,
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
    const result = await fetch(
      `${envOptions.clientApi}:signInWithPassword?key=${envOptions.projectApiKey}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: user.details.email,
          password: password,
          returnSecureToken: true,
        }),
      }
    );
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
    if (newDetails.displayName !== undefined) {
      update.displayName = newDetails.displayName;
    }

    const details = await getAuth().updateUser(id, newDetails);
    const updateMetadata = await updateFirestoreUser(id, {});

    if (!details) throw new Error("Error updating user in Firebase Auth.");
    if (!updateMetadata) {
      throw new Error("Error updating user metadata in Firestore.");
    }

    // Invalidate user cache (email/displayName don't affect list ordering)
    await handlePatchCache("users", id, false);

    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveUser = async (id: string): Promise<void> => {
  try {
    await getAuth().updateUser(id, {disabled: true});
    const process = await softDeleteFirestoreUser(id);
    if (!process) throw new Error("Error deleting user.");

    // Invalidate user cache (soft delete affects list and counts)
    await handleDeleteCache("users", id);
  } catch (error) {
    devLog(error);
  }
};

export const removeUser = async (id: string): Promise<void> => {
  try {
    await getAuth().deleteUser(id);
    const process = await deleteFirestoreUser(id);
    if (!process) throw new Error("Error deleting user.");

    // Invalidate user cache (hard delete affects list and counts)
    await handleDeleteCache("users", id);
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
    const redis = await ensureRedisConnection();
    // Always overwrite the code in Redis, even if one already exists
    await redis.set(`verify:${email}`, code, {EX: 600});
    return code;
  } catch (error) {
    devLog(error);
    return "Something went wrong";
  }
};

export const checkVerificationCode = async (
  email: string,
  code: string
): Promise<string | null> => {
  try {
    const redis = await ensureRedisConnection();
    const storedCode = await redis.get(`verify:${email}`);
    if (!storedCode || storedCode !== code) return null;
    await redis.del(`verify:${email}`);
    const token = uuidv4();
    await redis.set(`token:${token}`, email, {EX: 1800}); // 30 min TTL

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
    return "Something went wrong sending verification code";
  }
};

export const changePassword = async (
  redisToken: string,
  newPassword: string
): Promise<ApiResponse<string>> => {
  try {
    const redis = await ensureRedisConnection();
    const email = await redis.get(`token:${redisToken}`);
    if (!email) {
      devLog(`changePassword: Invalid or expired token: ${redisToken}`);
      return {success: false, data: "Invalid or expired token!"};
    }
    const user = await getAuthUserByEmail(email);
    if (!user) {
      devLog(`changePassword: No user found for email: ${email}`);
      return {success: false, data: "User not found."};
    }
    await getAuth().updateUser(user.id, {password: newPassword});
    await redis.del(`token:${redisToken}`);
    return {success: true, data: "Password changed successfully!"};
  } catch (error) {
    devLog(error);
    return {success: false, data: "Something went wrong."};
  }
};

export const forgetUsername = async (
  redisToken: string
): Promise<ApiResponse<string>> => {
  try {
    const redis = await ensureRedisConnection();
    const email = await redis.get(`token:${redisToken}`);
    if (!email) return {success: false, data: "Invalid or expired token!"};
    const user = await getAuthUserByEmail(email);
    if (!user) throw new Error("No user found in Firebase");
    const username = user.user.username;
    const html = `
      <h2>Username</h2>
      <p>Hello,</p>
      <p>Account: <strong>${email}</strong></p>
      <p>This is your username:</p>
      <div 
        style="font-size:2em;font-weight:bold;letter-spacing:0.2em;background:#f5f5f5;padding:10px;border-radius:6px;width:max-content;"
      >
        ${username}
      </div>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `;
    sendEmail(email, "Forgot Username", html);
    await redis.del(`token:${redisToken}`);
    return {success: true, data: "Successfully sent email."};
  } catch (error) {
    devLog(error);
    return {success: false, data: "Something went wrong"};
  }
};

export const checkUserChangePassword = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    const result = await fetch(
      `${envOptions.clientApi}:signInWithPassword?key=${envOptions.projectApiKey}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true,
        }),
      }
    );
    if (!result.ok) throw new Error("Firebase Auth API doesn't recognize user");
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

/**
 * Logout helper: verifies either a Firebase session cookie or an ID token
 * and revokes refresh tokens for the corresponding user to force sign-out
 * across clients. Returns true if revocation was attempted successfully or
 * false otherwise.
 */
export const logoutUserSession = async (
  sessionCookie?: string,
  idToken?: string
): Promise<boolean> => {
  try {
    // Prefer session cookie verification if provided
    if (sessionCookie) {
      try {
        const decoded = await getAuth().verifySessionCookie(
          sessionCookie,
          true
        );
        if (decoded?.uid) {
          await getAuth().revokeRefreshTokens(decoded.uid);
          return true;
        }
      } catch (err) {
        devLog(err, "logoutUserSession:verifySessionCookie");
        // fallthrough to try idToken if provided
      }
    }

    if (idToken) {
      try {
        const decoded = await getAuth().verifyIdToken(idToken);
        if (decoded?.uid) {
          await getAuth().revokeRefreshTokens(decoded.uid);
          return true;
        }
      } catch (err) {
        devLog(err, "logoutUserSession:verifyIdToken");
      }
    }

    // Nothing to revoke or attempts failed
    return false;
  } catch (error) {
    devLog(error, "logoutUserSession");
    return false;
  }
};
