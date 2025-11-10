import {z} from "zod";

export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .refine((val) => !val || !isNaN(Number(val)), {
      message: "Page must be a number.",
    }),
  limit: z
    .string()
    .optional()
    .default("10")
    .refine((val) => !val || !isNaN(Number(val)), {
      message: "Limit must be a number.",
    }),
});
