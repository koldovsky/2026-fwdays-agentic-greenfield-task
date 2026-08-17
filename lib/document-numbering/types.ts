/** On-disk counter file shape — kebab-case keys (NFR-13). */
export type DocNumberCounter = {
  year: number;
  "last-invoice-seq": number;
  "last-act-seq": number;
};
