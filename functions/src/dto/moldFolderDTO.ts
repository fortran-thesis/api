import * as z from "zod";

export const MoldFolderCreateSchema = z.object({
  user_id: z
    .string({ required_error: "User ID is required." })
    .min(1, { message: "User ID cannot be empty." }),
  name: z
    .string({ required_error: "Folder name is required." })
    .min(1, { message: "Folder name cannot be empty." }),
  identified_mold: z.string().nullable().optional(),
  // photo_url and is_archived are set in controller, not required from client
});

export const MoldFolderUpdateSchema = z.object({
  name: z
    .string({ required_error: "Folder name is required." })
    .min(1, { message: "Folder name cannot be empty." })
    .optional(),
  identified_mold: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
});
