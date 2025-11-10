import {devLog} from "../utils/dev";
import {registerUser} from "../services/authService";
import {Role} from "../types/enums";
import {RegisterMycologistRequest} from "../dto/mycologistDTO";
import {ApiResponse} from "../types/types";
import {getAuth} from "firebase-admin/auth";

export const registerMycologist = async (
  data: RegisterMycologistRequest
): Promise<{ userId: string; message: string } | null> => {
  try {
    // Use registerUser service with CURATOR role (mycologist)
    const result: ApiResponse<string> = await registerUser(
      data.username,
      data.email,
      data.password,
      data.first_name,
      data.last_name,
      "", // address (empty for mycologist)
      undefined, // phoneNumber (optional)
      Role.CURATOR // role: CURATOR = mycologist
    );

    if (!result.success) {
      throw new Error(result.error || "Registration failed");
    }

    // Extract userId from the auth record
    // Note: registerUser returns a success message, not the userId directly
    // We need to fetch it after creation
    const auth = getAuth();
    const userRecord = await auth.getUserByEmail(data.email);

    return {
      userId: userRecord.uid,
      message: result.data || "Mycologist registered successfully",
    };
  } catch (error) {
    devLog(error, "REGISTER_MYCOLOGIST");
    return null;
  }
};
