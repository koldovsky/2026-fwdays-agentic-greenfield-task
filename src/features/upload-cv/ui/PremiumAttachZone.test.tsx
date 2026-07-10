// Behavioral tests for the paid-gated attach zone (gate-premium-upload-zone,
// T4 §2.5; FR-PAYWALL-01/02, NFR-SEC-04, BC-HONESTY-01). The security contract
// under test: a non-paid render must not offer a `<input type="file">` — there
// is no client path to a file read without paid status, only a cosmetic blur +
// banner. `PremiumAttachZone` is a same-slice internal component (not part of
// the public barrel); the composer test covers it through `UploadCvDropzone`.
//
// Layout regression guard (folded in from the former
// PremiumAttachZone.layout.test.tsx): the fix inverted which !paid branch
// layer is `absolute`. Before the fix, the Premium banner (headline + body +
// upgrade CTA) was the `absolute inset-0` overlay and the blurred shell drove
// the container height, so with `overflow-hidden` the taller banner was
// clipped. After the fix, the blurred shell is the `aria-hidden` `absolute
// inset-0` backdrop, and the Premium banner is a normal-flow sibling that
// drives the container height. jsdom has no layout engine, so we can't assert
// pixel clipping directly — instead we lock in the structural invariant the
// fix depends on: the upgrade CTA's ancestor chain must contain no
// `absolute`-classed element. Note the backdrop echoes the same body copy as
// the banner (decorative duplication), so any query for body text must be
// scoped to the banner (not the aria-hidden backdrop) or use getAllByText.
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

/** The aria-hidden decorative backdrop (blurred shell). It echoes the same
 * body copy as the visible banner, but must never surface via accessible
 * queries (role/name), and is not where the upgrade CTA lives. */
function backdrop(container: HTMLElement): HTMLElement {
  return container.querySelector(".absolute.inset-0") as HTMLElement;
}

/** The visible Premium banner: a normal-flow sibling of the backdrop that
 * contains the badge, headline, body, and upgrade CTA, and drives the
 * container's height (the layout fix under test). */
function banner(container: HTMLElement): HTMLElement {
  const node = backdrop(container).nextElementSibling as HTMLElement;
  return node;
}

describe("PremiumAttachZone — non-paid (blurred, inert shell)", () => {
  it("renders a blurred aria-hidden backdrop and the Premium banner copy (ua)", () => {
    const { container } = render(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(container.querySelector(".blur-sm")).not.toBeNull();
    expect(backdrop(container)).toHaveAttribute("aria-hidden", "true");

    const bannerScope = within(banner(container));
    expect(bannerScope.getByText(ua.uploadCv.attach.premiumBadge)).toBeInTheDocument();
    expect(bannerScope.getByText(ua.uploadCv.premiumZone.headline)).toBeInTheDocument();
    expect(bannerScope.getByText(ua.uploadCv.premiumZone.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ua.uploadCv.premiumZone.upgradeAction }),
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

    const bannerScope = within(banner(container));
    expect(bannerScope.getByText(en.uploadCv.premiumZone.headline)).toBeInTheDocument();
    expect(bannerScope.getByText(en.uploadCv.premiumZone.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: en.uploadCv.premiumZone.upgradeAction }),
    ).toBeInTheDocument();
  });

  it("the body copy is duplicated in the decorative backdrop and the banner (both present, exactly twice)", () => {
    render(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(screen.getAllByText(ua.uploadCv.premiumZone.body)).toHaveLength(2);
  });

  it("renders NO file input — no client path to a file read without paid status", () => {
    const { container } = render(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("attaches no drop/dragover handlers in the free branch (cosmetic-only, NFR-SEC-04)", () => {
    const { container } = render(
      <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
    );

    const onFileSelected = vi.fn();
    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [pdfFile()] },
    });
    expect(onFileSelected).not.toHaveBeenCalled();
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

  describe("layout regression guard (clipped premium CTA)", () => {
    it("renders the premium badge, banner headline/body, and the upgrade CTA button", () => {
      render(
        <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
      );

      expect(screen.getAllByText(ua.uploadCv.attach.premiumBadge).length).toBeGreaterThan(0);
      expect(screen.getByText(ua.uploadCv.premiumZone.headline)).toBeInTheDocument();
      expect(screen.getAllByText(ua.uploadCv.premiumZone.body).length).toBeGreaterThan(0);
      expect(
        screen.getByRole("button", { name: ua.uploadCv.premiumZone.upgradeAction }),
      ).toBeInTheDocument();
    });

    it("the upgrade CTA button's ancestor chain contains no 'absolute'-classed element (banner is in normal flow, not clipped)", () => {
      render(
        <PremiumAttachZone paid={false} onFileSelected={vi.fn()} onClearAttachment={vi.fn()} />,
      );

      const button = screen.getByRole("button", { name: ua.uploadCv.premiumZone.upgradeAction });

      let node: HTMLElement | null = button;
      const offendingAncestors: HTMLElement[] = [];
      while (node) {
        if (node.classList.contains("absolute")) offendingAncestors.push(node);
        node = node.parentElement;
      }

      expect(offendingAncestors).toHaveLength(0);
    });
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
