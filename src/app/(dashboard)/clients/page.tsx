import { ClientsPageContent } from "@/components/clients/clients-page-content";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="wf-display">Clients</h1>
        <p className="mt-1 text-wf-text-2">
          Manage customers who receive your invoices.
        </p>
      </div>
      <p className="text-[13px] text-wf-text-2">
        Довідник клієнтів зберігається в браузері і підставляє дані в форму
        інвойсу.
      </p>
      <ClientsPageContent />
    </div>
  );
}
