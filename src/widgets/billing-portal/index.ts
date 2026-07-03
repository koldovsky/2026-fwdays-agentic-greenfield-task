// Public API for the billing-portal widget (add-payments-emulator tasks
// 3.1–3.3, FR-BILLING-01/02/03) — other layers import ONLY this barrel.
export { BillingPortal, type BillingPortalProps } from "./ui/BillingPortal";
export { deriveInvoices, type SyntheticInvoice } from "./lib/invoices";
