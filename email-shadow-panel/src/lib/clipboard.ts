import { toast } from "sonner";

interface CopyOptions {
  success?: string;
  error?: string;
}

export async function copyToClipboard(value: string, options: CopyOptions = {}): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(options.success ?? "Copied to clipboard");
    return true;
  } catch {
    toast.error(options.error ?? "Clipboard permission blocked");
    return false;
  }
}
