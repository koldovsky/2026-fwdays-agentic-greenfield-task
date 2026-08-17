import path from "node:path";

/** Invoice template filename (BC-07 spelling). */
export const INVOICE_TEMPLATE_FILENAME = "invoce.html";

/** Act template filename. */
export const ACT_TEMPLATE_FILENAME = "complete.html";

export function templatesDir(cwd: string = process.cwd()): string {
  return path.join(cwd, "templates");
}

export function invoiceTemplatePath(cwd: string = process.cwd()): string {
  return path.join(templatesDir(cwd), INVOICE_TEMPLATE_FILENAME);
}

export function actTemplatePath(cwd: string = process.cwd()): string {
  return path.join(templatesDir(cwd), ACT_TEMPLATE_FILENAME);
}
