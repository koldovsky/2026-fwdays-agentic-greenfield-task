"use client";
// @trace FR-CYCLE-01

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { Dialog } from "@/components/feedback/Dialog";
import { CreateCycleForm } from "./CreateCycleForm";
import { uk } from "@/lib/i18n/uk";

const t = uk.cycles;

type Props = {
  templates: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; fullName: string }>;
};

/**
 * Create-cycle affordance (FR-CYCLE-01). A right-aligned trigger button that
 * opens the create form in a modal `Dialog`; the form itself is unchanged
 * (same fields, validation, and createCycle server action) and navigates to
 * the new cycle on success, which unmounts this modal. Cancel or Escape closes
 * without creating anything.
 */
export function CreateCycleModal({ templates, employees }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        {t.createCycle}
      </Button>
      <Dialog
        open={open}
        title={t.createCycle}
        onClose={() => setOpen(false)}
      >
        <CreateCycleForm
          templates={templates}
          employees={employees}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </div>
  );
}
