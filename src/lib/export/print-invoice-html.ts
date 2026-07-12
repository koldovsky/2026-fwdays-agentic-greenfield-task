import { EmptyInvoiceHtmlError } from "@/lib/export/download-invoice-html";

const PRINT_CLEANUP_TIMEOUT_MS = 60_000;

/** Print the document already rendered in the live preview iframe (WYSIWYG). */
export function printInvoiceFrame(iframe: HTMLIFrameElement): void {
  const contentWindow = iframe.contentWindow;
  if (!contentWindow) {
    throw new Error("Preview iframe has no content window.");
  }
  contentWindow.focus();
  contentWindow.print();
}

function schedulePrint(contentWindow: Window): void {
  requestAnimationFrame(() => {
    contentWindow.focus();
    contentWindow.print();
  });
}

/**
 * Fallback print path: load HTML in an off-screen A4 iframe.
 * Hidden iframes must not use 0×0 dimensions — browsers print a blank page.
 */
export function printInvoiceHtml(html: string): Promise<void> {
  if (html.trim().length === 0) {
    return Promise.reject(new EmptyInvoiceHtmlError());
  }

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    iframe.style.border = "0";

    let settled = false;

    const finish = (error?: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      iframe.remove();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      finish();
    }, PRINT_CLEANUP_TIMEOUT_MS);

    iframe.onload = () => {
      const contentWindow = iframe.contentWindow;
      if (!contentWindow) {
        finish(new Error("Print iframe has no content window."));
        return;
      }

      contentWindow.addEventListener(
        "afterprint",
        () => {
          finish();
        },
        { once: true }
      );

      try {
        schedulePrint(contentWindow);
      } catch (error) {
        finish(error);
      }
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
}
