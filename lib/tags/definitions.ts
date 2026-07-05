import * as z from "zod";

export const TagInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Tag name is required." })
    .max(50, { error: "Tag name is too long." }),
});

export type TagInput = z.infer<typeof TagInputSchema>;
