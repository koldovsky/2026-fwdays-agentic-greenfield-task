"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  employeeInputSchema,
  toFieldErrors,
  type EmployeeFieldErrors,
} from "@/lib/schemas/employee";
import { getCurrentHrUser } from "@/app/(cabinet)/current-user";
import { uk } from "@/lib/i18n/uk";

/**
 * Employee directory write actions (FR-DIR-01, FR-DIR-02, FR-DIR-03). Each
 * action first re-asserts the HR session server-side (defense-in-depth — the
 * proxy guard is not the only gate, NFR-SEC-01), then parses the FormData with
 * the shared Zod schema BEFORE any DB write, returning a typed result — never a
 * raw error, stack, or 500 (TC-VALID-01). A unique-email collision (Prisma
 * P2002) is translated to an inline email field error; any other throw becomes
 * a single generic field error. Archiving is a soft state change
 * (`archived = true`), never a hard delete (FR-DIR-02). PII is persisted only
 * here in the DB and is never logged.
 */
export type EmployeeActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: EmployeeFieldErrors };

/** A typed failure carrying a single generic message under the email field. */
function genericFailure(message: string): EmployeeActionResult {
  return { ok: false, fieldErrors: { email: message } };
}

/** Read the five known fields from FormData into a plain object for parsing. */
function readEmployeeForm(formData: FormData): Record<string, unknown> {
  return {
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "",
    phone: formData.get("phone") ?? "",
    telegramHandle: formData.get("telegramHandle") ?? "",
  };
}

/** True when the throw is a Prisma unique-constraint violation on email. */
function isUniqueEmailError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function createEmployee(formData: FormData): Promise<EmployeeActionResult> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) {
    return genericFailure(uk.directory.errors.saveFailed);
  }

  const parsed = employeeInputSchema.safeParse(readEmployeeForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    const employee = await db.employee.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: parsed.data.role ?? null,
        phone: parsed.data.phone ?? null,
        telegramHandle: parsed.data.telegramHandle ?? null,
      },
    });
    revalidatePath("/employees");
    return { ok: true, id: employee.id };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return genericFailure(uk.directory.errors.emailTaken);
    }
    return genericFailure(uk.directory.errors.saveFailed);
  }
}

export async function updateEmployee(
  id: string,
  formData: FormData,
): Promise<EmployeeActionResult> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) {
    return genericFailure(uk.directory.errors.saveFailed);
  }

  const parsed = employeeInputSchema.safeParse(readEmployeeForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    await db.employee.update({
      where: { id },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: parsed.data.role ?? null,
        phone: parsed.data.phone ?? null,
        telegramHandle: parsed.data.telegramHandle ?? null,
      },
    });
    revalidatePath("/employees");
    return { ok: true, id };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return genericFailure(uk.directory.errors.emailTaken);
    }
    return genericFailure(uk.directory.errors.saveFailed);
  }
}

export async function archiveEmployee(id: string): Promise<EmployeeActionResult> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) {
    return genericFailure(uk.directory.errors.saveFailed);
  }

  try {
    await db.employee.update({ where: { id }, data: { archived: true } });
    revalidatePath("/employees");
    return { ok: true, id };
  } catch {
    return genericFailure(uk.directory.errors.saveFailed);
  }
}
