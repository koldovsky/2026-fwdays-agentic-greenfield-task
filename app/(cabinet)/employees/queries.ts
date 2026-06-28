import { db } from "@/lib/db";

/**
 * Active employees, alphabetised (FR-DIR-02). Archived employees are excluded
 * from the active list (and, later, from cycle-subject selection) but remain in
 * the DB, resolvable by id for historical cycles. A fetch failure throws and is
 * caught by the cabinet `error.tsx` boundary — never a raw 500 to the user.
 */
export function listActiveEmployees() {
  return db.employee.findMany({
    where: { archived: false },
    orderBy: { fullName: "asc" },
  });
}
