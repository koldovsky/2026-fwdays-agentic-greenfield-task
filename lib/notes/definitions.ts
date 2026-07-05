import * as z from "zod";

export const NoteInputSchema = z.object({
  title: z.string().max(300, { error: "Title is too long." }),
  content: z.string().max(200_000, { error: "Note is too long." }),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;
