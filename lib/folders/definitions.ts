import * as z from "zod";

export const FolderInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Folder name is required." })
    .max(100, { error: "Folder name is too long." }),
});

export type FolderInput = z.infer<typeof FolderInputSchema>;
