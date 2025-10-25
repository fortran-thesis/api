import {getAuth} from "firebase-admin/auth";
import {devLog} from "../utils/dev";
import {ApiResponse, IsCurator, User} from "../types/types";
import {
  findFirestoreUserById,
  updateFirestoreUser,
} from "../repositories/userRepository";
import {sendEmail} from "../utils/email";

export const toggleUser = async (
  id: string,
  email: string,
  bool: boolean
): Promise<ApiResponse<string>> => {
  try {
    let message = "";
    const user = await getAuth().updateUser(id, {disabled: bool});
    if (user.disabled !== true && !user) {
      throw new Error("Failed to disable user.");
    }
    switch (user.disabled) {
    case true:
      message = "enabled";
      break;
    default:
      message = "disabled";
      break;
    }
    const html = `
      <h2>Account Status Changed</h2>
      <p>Hello,</p>
      <p>Your account has been <strong>${message}</strong> by an administrator.</p>
      <p>If you believe this is a mistake, please contact support.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `;
    await sendEmail(email, `Your account has been ${message}`, html);
    return {success: true, data: `Successfully ${message} user.`};
  } catch (error) {
    devLog(error);
    return {success: false, data: "Something went wrong."};
  }
};

export const banUser = async (
  id: string,
  email: string
): Promise<ApiResponse<string>> => {
  try {
    const user = await findFirestoreUserById(id);
    if (!user) throw new Error("User not found");
    const process = await updateFirestoreUser(id, {
      is_banned: true,
    } as Partial<User>);
    if (!process) throw new Error("Failed to ban user.");
    const html = `
      <h2>Account Banned</h2>
      <p>Hello,</p>
      <p>Your account has been <strong>banned</strong> due to violation of our terms or community guidelines.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `;
    await sendEmail(email, "Your account has been banned", html);
    return {success: true, data: "Successfully banned user."};
  } catch (error) {
    devLog(error);
    return {success: false, data: "Something went wrong."};
  }
};

export const approveCurator = async (
  id: string,
  isApproved: boolean
): Promise<ApiResponse<string>> => {
  try {
    const userSnap = await findFirestoreUserById(id);
    if (!userSnap || !userSnap.exists) throw new Error("User not found");
    const user = userSnap.data();
    const process = await updateFirestoreUser(id, {
      is_verified: true,
    } as Partial<IsCurator<User>>);
    if (!process) throw new Error("Failed to update user.");
    const html = `
      <h2>Curator Application Approved</h2>
      <p>Hello,</p>
      <p>Congratulations! Your application to become a curator has been <strong>approved</strong>.</p>
      <p>You now have access to curator features and responsibilities.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `;
    await sendEmail(user?.email, "Curator Application Approved", html);
    return {success: true, data: "Successfully approved curator"};
  } catch (error) {
    devLog(error);
    return {success: false, data: "Something went wrong."};
  }
};

export const rejectCurator = async (
  id: string,
  isApproved: boolean
): Promise<ApiResponse<string>> => {
  try {
    const userSnap = await findFirestoreUserById(id);
    if (!userSnap || !userSnap.exists) throw new Error("User not found");
    const user = userSnap.data();
    const process = await updateFirestoreUser(id, {
      is_verified: false,
    } as Partial<IsCurator<User>>);
    if (!process) throw new Error("Failed to update user.");
    const html = `
      <h2>Curator Application Rejected</h2>
      <p>Hello,</p>
      <p>We regret to inform you that your application to become a curator has been <strong>rejected</strong>.</p>
      <p>If you have questions or would like to reapply, please contact support.</p>
      <p>Thanks,<br/>The Moldify Team</p>
    `; // TODO: idk process after rejecting curator
    await sendEmail(user?.email, "Curator Application Rejected", html);
    return {success: true, data: "Successfully rejected curator"};
  } catch (error) {
    devLog(error);
    return {success: false, data: "Something went wrong."};
  }
};
