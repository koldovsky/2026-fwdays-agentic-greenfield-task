"use client";

import { useEffect, useRef } from "react";
import { createNote } from "@/app/actions/notes";

export function AutoCreateNoteForm() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={createNote} className="sr-only" aria-hidden>
      <button type="submit">Create note</button>
    </form>
  );
}
