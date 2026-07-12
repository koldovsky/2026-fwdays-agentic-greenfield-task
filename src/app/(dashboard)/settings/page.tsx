import { SupplierSettingsPanel } from "@/components/supplier/supplier-settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="wf-display">Налаштування</h1>
        <p className="mt-1 text-wf-text-2">
          Профілі постачальника (ФОП): реквізити, IBAN для USD/EUR. Зберігається
          лише в браузері.
        </p>
      </div>
      <SupplierSettingsPanel />
    </div>
  );
}
