export interface Client {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  company?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export interface InvoiceCustomerFields {
  customerName: string;
  customerAddress1: string;
  customerEmail: string;
  customerPhone: string;
  customerWebsite: string;
}
