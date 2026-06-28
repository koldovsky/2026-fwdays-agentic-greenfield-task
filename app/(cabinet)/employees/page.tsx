import { PageHeader } from "@/components/shell/PageHeader";
import { uk } from "@/lib/i18n/uk";
import { listActiveEmployees } from "./queries";
import { DirectoryView, type EmployeeRow } from "./directory-view";

/**
 * Employee directory (FR-DIR-02, FR-DIR-04, FR-SHELL-03). Server component:
 * fetches the active employees, then renders the client `DirectoryView` inside
 * the cabinet shell. A fetch failure throws and is caught by the cabinet
 * `error.tsx` boundary — never a raw 500. Nullable optional columns are
 * normalised to empty strings for the form/list, keeping the boundary typed
 * (no casts). PII stays server-to-client only for display; it is never logged
 * or placed in an AI prompt (BC-PRIVACY-04).
 */
export default async function EmployeesPage() {
  const employees = await listActiveEmployees();
  const rows: EmployeeRow[] = employees.map((employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    role: employee.role ?? "",
    phone: employee.phone ?? "",
    telegramHandle: employee.telegramHandle ?? "",
  }));

  return (
    <>
      <PageHeader title={uk.directory.title} />
      <div className="px-[var(--space-9)] py-[var(--space-8)]">
        <DirectoryView employees={rows} />
      </div>
    </>
  );
}
