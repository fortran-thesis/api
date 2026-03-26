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
  findFirestoreUserById,
} from "../repositories/userRepository";
import {Role} from "../types/enums";
import {DeviceType, canAccessDevice} from "../types/device";
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
import {transformToSignedUrl} from "../utils/storageTransform";
import {v4 as uuidv4} from "uuid";
import {envOptions} from "../configs/environment";

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  address: string,
  phoneNumber?: string,
  role: Role = Role.USER,
  occupation?: string
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
      ...(occupation && {occupation}),
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const details = await addUser(user, userId);
    if (!details) throw new Error("Could not register user!");

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
    devLog(`🔵 registerOAuthUser: Starting for UID ${uid}`);

    // Check if Firestore user exists
    const firestoreUser = await findFirestoreUserById(uid);
    if (firestoreUser) {
      // User already exists in Firestore, treat as success
      devLog(`✅ registerOAuthUser: Firestore user already exists for UID ${uid}`);
      return {
        success: true,
        data: "User already exists in Firestore.",
      };
    }
    devLog(`🔍 registerOAuthUser: No Firestore user found for UID ${uid}, will create`);

    // User doesn't exist in Firestore, check Firebase Auth
    let userExistsInAuth = false;
    try {
      await getAuth().getUser(uid);
      userExistsInAuth = true;
      devLog("✅ registerOAuthUser: User exists in Firebase Auth");
    } catch (err: any) {
      if (err.code !== "auth/user-not-found") throw err;
      devLog("❌ registerOAuthUser: User not found in Firebase Auth");
    }

    if (!userExistsInAuth) {
      // User doesn't exist anywhere
      throw new Error(`OAuth user UID ${uid} not found in Firebase Auth`);
    }

    // User exists in Firebase Auth but not in Firestore - create Firestore record
    const user: WithMetadata<User> = {
      username: "",
      first_name: "",
      last_name: "",
      address: "",
      role: Role.USER, // Default role is USER (="farmer")
      is_banned: false,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    devLog(`📝 registerOAuthUser: About to create user with role=${user.role}`);
    const details = await addUser(user, uid);
    devLog(`📝 registerOAuthUser: addUser returned: ${details ? "DocumentSnapshot" : "null"}`);

    if (!details) throw new Error("Could not register user in Firestore! addUser returned null");
    devLog(`✅ registerOAuthUser: Created Firestore user with UID ${uid} and role ${Role.USER}`);
    return {
      success: true,
      data: "Successfully created user in Firebase Firestore!",
    };
  } catch (error) {
    devLog(error, "REGISTER_OAUTH_USER");
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
  token: string,
  deviceType?: DeviceType
): Promise<string | null> => {
  try {
    const user: WithId<APIUser> | null = await verifyToken(token);
    if (!user) throw new Error("Invalidated token for user.");

    // If device type is provided, check if user's role can access this device
    if (deviceType) {
      devLog(`🔍 Device access check: Role='${user.user.role}', Device='${deviceType}'`);
      if (!canAccessDevice(user.user.role, deviceType)) {
        devLog(`❌ Access denied: Role '${user.user.role}' cannot access device '${deviceType}'`);
        throw new Error(`Role '${user.user.role}' cannot access device '${deviceType}'`);
      }
      devLog(`✅ Device access granted for role '${user.user.role}' on device '${deviceType}'`);
    }

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

    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const updateUserProfile = async (
  id: string,
  profile: Partial<{
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    displayName?: string;
    address?: string;
    phoneNumber?: string;
    photo_url?: string;
  }>
): Promise<boolean> => {
  try {
    devLog(`[updateUserProfile] Starting with id: ${id}`);
    devLog(`[updateUserProfile] Received profile: ${JSON.stringify(profile)}`);

    // Update Firebase Auth fields
    const authUpdate: UpdateRequest = {};
    if (profile.email !== undefined) authUpdate.email = profile.email;
    if (profile.displayName !== undefined) authUpdate.displayName = profile.displayName;
    if (profile.photo_url !== undefined) {
      // Convert storage path to signed URL if not already a URL
      if (profile.photo_url.startsWith("http")) {
        authUpdate.photoURL = profile.photo_url;
      } else {
        const signedUrl = await transformToSignedUrl(profile.photo_url);
        if (signedUrl) {
          authUpdate.photoURL = signedUrl;
        }
      }
    }

    // Normalize phone number if provided (E.164 PH normalization)
    const normalizePH = (raw?: string): string | undefined => {
      if (!raw) return undefined;
      let p = raw.trim();
      p = p.replace(/[^0-9+]/g, "");
      if (p.startsWith("+63")) return p;
      if (p.startsWith("+")) return p;
      if (p.startsWith("63")) return `+${p}`;
      if (p.startsWith("0")) return `+63${p.slice(1)}`;
      return `+63${p}`;
    };

    // Update Firebase Auth phone number if provided
    if (profile.phoneNumber !== undefined) {
      const normalized = normalizePH(profile.phoneNumber);
      if (normalized) authUpdate.phoneNumber = normalized;
    }

    // Update Firestore user fields
    const firestoreUpdate: any = {};
    if (profile.username !== undefined) firestoreUpdate.username = profile.username;
    if (profile.firstName !== undefined) firestoreUpdate.first_name = profile.firstName;
    if (profile.lastName !== undefined) firestoreUpdate.last_name = profile.lastName;
    if (profile.address !== undefined) firestoreUpdate.address = profile.address;
    if (profile.phoneNumber !== undefined) firestoreUpdate.phone_number = normalizePH(profile.phoneNumber) || profile.phoneNumber;
    // Do not write `photo_url` to Firestore user document (leave original types unchanged)

    devLog(`[updateUserProfile] authUpdate: ${JSON.stringify(authUpdate)}`);
    devLog(`[updateUserProfile] firestoreUpdate: ${JSON.stringify(firestoreUpdate)}`);

    // Run both updates if provided
    const authResult = true;
    if (Object.keys(authUpdate).length > 0) {
      devLog("[updateUserProfile] Updating Firebase Auth...");
      const details = await getAuth().updateUser(id, authUpdate);
      if (!details) throw new Error("Error updating user in Firebase Auth.");
      devLog("[updateUserProfile] Firebase Auth updated successfully");
    } else {
      devLog("[updateUserProfile] No Auth fields to update");
    }

    if (Object.keys(firestoreUpdate).length > 0) {
      devLog("[updateUserProfile] Updating Firestore...");
      const updated = await updateFirestoreUser(id, firestoreUpdate);
      if (!updated) throw new Error("Error updating user in Firestore.");
      devLog("[updateUserProfile] Firestore updated successfully");
    } else {
      devLog("[updateUserProfile] No Firestore fields to update");
    }

    return authResult;
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
        // Try as ID token first
        const decoded = await getAuth().verifyIdToken(idToken);
        if (decoded?.uid) {
          await getAuth().revokeRefreshTokens(decoded.uid);
          return true;
        }
      } catch (err) {
        // If ID token verification fails, try as session cookie
        // (mobile app might be sending session token in Authorization header)
        try {
          const decoded = await getAuth().verifySessionCookie(idToken, true);
          if (decoded?.uid) {
            await getAuth().revokeRefreshTokens(decoded.uid);
            return true;
          }
        } catch (sessionErr) {
          devLog(err, "logoutUserSession:verifyIdToken");
        }
      }
    }

    // Nothing to revoke or attempts failed
    return false;
  } catch (error) {
    devLog(error, "logoutUserSession");
    return false;
  }
};
