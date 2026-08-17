export type DocType = "invoice_act" | "invoice" | "act";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ContactRef = {
  "full-name": string;
  inn: string;
  phone: string;
  acc: string;
  bank: string;
  "mfo-bank": string;
  addr: string;
};

export type ServiceLine = {
  "sign-name": string;
  "service-name": string;
  amount: number;
  price: number;
};

/** On-disk / API JSON shape — kebab-case keys (NFR-13). */
export type DocumentSession = {
  guid: string;
  "doc-type": DocType;
  "current-step": WizardStep;
  completed: boolean;
  date: string;
  "invoice-number"?: string;
  "act-number"?: string;
  client?: ContactRef;
  "done-by"?: ContactRef;
  services: ServiceLine[];
  "copied-from"?: string;
  "updated-at": string;
};

export type DocumentSessionPatch = Partial<
  Omit<DocumentSession, "guid" | "updated-at">
>;
