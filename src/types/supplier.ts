/** FR-BANK-02 supplier (ФОП) profile stored in browser localStorage. */
export interface SupplierProfile {
  id: string;
  label: string;
  nameEn: string;
  nameUa: string;
  addressEn: string;
  addressUa: string;
  taxId: string;
  bankName: string;
  swift: string;
  ibanUsd: string;
  ibanEur: string;
  createdAt: string;
  updatedAt: string;
}

export type SupplierProfileInput = Omit<
  SupplierProfile,
  "id" | "createdAt" | "updatedAt"
>;
