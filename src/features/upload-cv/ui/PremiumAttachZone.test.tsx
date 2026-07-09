// Behavioral tests for the paid-gated attach zone (gate-premium-upload-zone,
// T4 §2.5; FR-PAYWALL-01/02, NFR-SEC-04, BC-HONESTY-01). The security contract
// under test: a non-paid render must not offer a `<input type="file">` — there
// is no client path to a file read without paid status, only a cosmetic blur +
// banner. `PremiumAttachZone` is a same-slice internal component (not part of
// the public barrel); the composer test covers it through `UploadCvDropzone`.
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { en, ua } from "@/shared/lib/i18n";
import { PDF_MIME } from "@/shared/lib/parse-document";

import { PremiumAttachZone } from "./PremiumAttachZone";

function pdfFile(): File {
  return new File(["%PDF-1.4 tiny"], "cv.pdf", { type: PDF_MIME });
}

/** The visible Premium overlay (as opposed to the blurred, aria-hidden shell
 * behind it, which also echoes the body copy per the component's own markup). */
function overlay(container: HTMLElement): HTMLElement {
  return container.querySelector(".absolute.inset-0") as HTMLElement;
}

describe("PremiumAttachZone — non-paid (blurred, inert shell)", () => {
  it("renders a blurred element and the Premium banner copy (ua)", () => {
    const { container } = render(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(container.querySelector(".blur-sm")).not.toBeNull();
    const banner = within(overlay(container));
    expect(banner.getByText(ua.uploadCv.premiumZone.headline)).toBeInTheDocument();
    expect(banner.getByText(ua.uploadCv.premiumZone.body)).toBeInTheDocument();
    expect(
      banner.getByRole("button", { name: ua.uploadCv.premiumZone.upgradeAction }),
    ).toBeInTheDocument();
  });

  it("renders the Premium banner copy in English when locale=en", () => {
    const { container } = render(
      <PremiumAttachZone
        locale="en"
        paid={false}
        onFileSelected={vi.fn()}
        onClearAttachment={vi.fn()}
      />,
    );

    const banner = within(overlay(container));
    expect(banner.getByText(en.uploadCv.premiumZone.headline)).toBeInTheDocument();
    expect(banner.getByText(en.uploadCv.premiumZone.body)).toBeInTheDocument();
    expect(
      banner.getByRole("button", { name: en.uploadCv.premiumZone.upgradeAction }),
    ).toBeInTheDocument();
  });

  it("renders NO file input — no client path to a file read without paid status", () => {
    const { container } = render(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("the upgrade button calls onUpgrade", async () => {
    const onUpgrade = vi.fn();
    render(
      <PremiumAttachZone
        paid={false}
        onFileSelected={vi.fn()}
        onClearAttachment={vi.fn()}
        onUpgrade={onUpgrade}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: ua.uploadCv.premiumZone.upgradeAction }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("server-renders (SSR smoke test) without throwing and includes the banner copy", () => {
    const html = renderToStaticMarkup(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(html).toContain(ua.uploadCv.premiumZone.headline);
    expect(html).toContain(ua.uploadCv.premiumZone.upgradeAction);
    expect(html).not.toContain('type="file"');
  });
});

describe("PremiumAttachZone — paid (live PDF drop target)", () => {
  it("renders a file input and no blur", () => {
    const { container } = render(
      <PremiumAttachZone paid onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(container.querySelector(".blur-sm")).toBeNull();
    expect(screen.queryByText(ua.uploadCv.premiumZone.headline)).not.toBeInTheDocument();
  });

  it("calls onFileSelected with the File when a PDF is dropped in the live zone", () => {
    const onFileSelected = vi.fn();
    render(<PremiumAttachZone paid onFileSelected={onFileSelected} onClearAttachment={vi.fn()} />);

    const zone = screen.getByText(ua.uploadCv.attach.addOriginalPdf).closest("div") as HTMLElement;
    const file = pdfFile();
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("calls onFileSelected with the File chosen via the file input", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(
      <PremiumAttachZone paid onFileSelected={onFileSelected} onClearAttachment={vi.fn()} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = pdfFile();
    await userEvent.upload(input, file);

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows the attached label with the attached name and a remove button that calls onClearAttachment", async () => {
    const onClearAttachment = vi.fn();
    render(
      <PremiumAttachZone
        paid
        attachedName="cv-original.pdf"
        onFileSelected={vi.fn()}
        onClearAttachment={onClearAttachment}
      />,
    );

    expect(
      screen.getByText(new RegExp(ua.uploadCv.attach.attachedLabel)),
    ).toHaveTextContent("cv-original.pdf");

    await userEvent.click(screen.getByRole("button", { name: ua.uploadCv.attach.remove }));
    expect(onClearAttachment).toHaveBeenCalledTimes(1);
  });

  it("shows the too-large alert when attachTooLarge is true", () => {
    render(
      <PremiumAttachZone
        paid
        attachTooLarge
        onFileSelected={vi.fn()}
        onClearAttachment={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(ua.uploadCv.attach.tooLarge);
  });

  it("does not show the attached label or the too-large alert absent those props", () => {
    render(<PremiumAttachZone paid onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />);

    expect(screen.queryByText(new RegExp(ua.uploadCv.attach.attachedLabel))).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
