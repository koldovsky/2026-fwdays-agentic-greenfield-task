import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({ userId: "usr_001", username: "test", fullName: "Адміністратор тестової системи", role: "Адміністратор" }),
}));
vi.mock("@/lib/actions", () => ({ logoutAction: async () => undefined }));

import { Shell } from "@/components/shell";

describe("authenticated shell", () => {
  // @trace FR-13
  it("renders every primary destination and logout affordance", async () => {
    const html = renderToStaticMarkup(await Shell({ eyebrow: "Тест", title: "Навігація", children: <p>Вміст</p> }));
    expect(html).toContain('aria-label="Головна навігація"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/inventory"');
    expect(html).toContain('href="/procurement"');
    expect(html).toContain('href="/manufacturing"');
    expect(html).toContain('href="/ledger"');
    expect(html).toContain("Вийти");
  });
});

// @trace FR-13
