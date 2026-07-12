import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  InvoiceRecord,
  InvoiceRecordInput,
  InvoiceSnapshot,
} from "@/types/invoice-record";
import {
  __resetInvoiceCacheForTests,
  deleteInvoice,
  deriveOverdue,
  getInvoice,
  INVOICE_REGISTER_STORAGE_KEY,
  InvoiceNotFoundError,
  listInvoices,
  saveInvoice,
  setInvoiceStatus,
} from "@/lib/storage/invoice-register";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    __store: store,
  };
}

function buildSnapshot(overrides: Partial<InvoiceSnapshot> = {}): InvoiceSnapshot {
  return {
    supplier: { nameEn: "FOP Test", ibanEur: "UA903223130000026007233566020" },
    customer: { name: "Acme Corp", email: "billing@acme.example" },
    serviceRows: [{ description: "Design", qty: 1, unitPrice: 1000 }],
    totals: { subtotal: 1000, total: 1000 },
    termsText: { en: "Net 7 days", ua: "Оплата протягом 7 днів" },
    ...overrides,
  };
}

function buildInput(overrides: Partial<InvoiceRecordInput> = {}): InvoiceRecordInput {
  return {
    invoiceNumber: "2026-001",
    status: "draft",
    issueDateIso: "2026-07-01",
    paymentDeadlineIso: "2026-07-08",
    snapshot: buildSnapshot(),
    ...overrides,
  };
}

describe("invoice-register storage", () => {
  let storageMock: ReturnType<typeof createLocalStorageMock>;
  let idCounter = 0;

  beforeEach(() => {
    idCounter = 0;
    storageMock = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storageMock });
    vi.stubGlobal("crypto", { randomUUID: () => `invoice-test-id-${++idCounter}` });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T10:00:00.000Z"));
    __resetInvoiceCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // @trace FR-REG-01
  describe("stored statuses (FR-REG-01)", () => {
    it("persists a manually set status through the four values", () => {
      const saved = saveInvoice(buildInput({ status: "draft" }));
      expect(saved.status).toBe("draft");

      for (const status of ["sent", "paid", "cancelled"] as const) {
        const updated = setInvoiceStatus(saved.id, status);
        expect(updated.status).toBe(status);
        expect(getInvoice(saved.id)?.status).toBe(status);
      }
    });

    it("marks sent without any email side effect (status is the only change)", () => {
      const saved = saveInvoice(buildInput({ status: "draft" }));
      const sent = setInvoiceStatus(saved.id, "sent");
      expect(sent.status).toBe("sent");
      expect(sent.invoiceNumber).toBe(saved.invoiceNumber);
      expect(sent.snapshot).toEqual(saved.snapshot);
    });

    it("throws InvoiceNotFoundError when setting status on an unknown id", () => {
      expect(() => setInvoiceStatus("missing", "sent")).toThrow(InvoiceNotFoundError);
    });

    it("updates an existing invoice in place, preserving id and createdAt", () => {
      const created = saveInvoice(buildInput({ status: "draft" }));
      vi.setSystemTime(new Date("2026-07-11T10:00:00.000Z"));
      const updated = saveInvoice({
        ...buildInput({ status: "paid", invoiceNumber: "2026-777" }),
        id: created.id,
      });
      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
      expect(updated.status).toBe("paid");
      expect(updated.invoiceNumber).toBe("2026-777");
      expect(listInvoices()).toHaveLength(1);
    });

    it("deep-clones the snapshot on update, isolating it from the source", () => {
      const created = saveInvoice(buildInput());
      const snapshot = buildSnapshot({ customer: { name: "Updated Co" } });
      const updated = saveInvoice({ ...buildInput({ snapshot }), id: created.id });
      snapshot.customer.name = "MUTATED";
      expect(getInvoice(updated.id)?.snapshot.customer.name).toBe("Updated Co");
    });

    it("throws InvoiceNotFoundError when saving with an unknown id", () => {
      expect(() =>
        saveInvoice({ ...buildInput(), id: "no-such-invoice" })
      ).toThrow(InvoiceNotFoundError);
    });

    it("trims the invoice number before persisting", () => {
      const saved = saveInvoice(buildInput({ invoiceNumber: "  2026-042  " }));
      expect(saved.invoiceNumber).toBe("2026-042");
      expect(getInvoice(saved.id)?.invoiceNumber).toBe("2026-042");
    });

    it("rejects a shape-valid but impossible calendar date", () => {
      expect(() =>
        saveInvoice(buildInput({ paymentDeadlineIso: "2026-02-30" }))
      ).toThrow(/ISO date/);
    });
  });

  // @trace FR-REG-02
  describe("derived overdue (FR-REG-02)", () => {
    const today = "2026-07-10";

    it("is overdue only when sent and the deadline is before today", () => {
      const sentOverdue = saveInvoice(buildInput({ status: "sent", paymentDeadlineIso: "2026-07-09" }));
      expect(deriveOverdue(sentOverdue, today)).toBe(true);
    });

    it("is not overdue when the deadline is today or later", () => {
      const dueToday = saveInvoice(buildInput({ status: "sent", paymentDeadlineIso: today }));
      expect(deriveOverdue(dueToday, today)).toBe(false);
    });

    it("normalizes a full ISO timestamp today, not flagging a same-day deadline", () => {
      const dueToday = saveInvoice(buildInput({ status: "sent", paymentDeadlineIso: today }));
      // A caller passing new Date().toISOString() must not read as overdue.
      expect(deriveOverdue(dueToday, `${today}T23:59:59.000Z`)).toBe(false);
    });

    it("is never overdue for draft, paid, or cancelled even past the deadline", () => {
      for (const status of ["draft", "paid", "cancelled"] as const) {
        const rec = saveInvoice(buildInput({ status, paymentDeadlineIso: "2026-01-01" }));
        expect(deriveOverdue(rec, today)).toBe(false);
      }
    });

    it("never stores overdue: no persisted record carries the field", () => {
      saveInvoice(buildInput({ status: "sent", paymentDeadlineIso: "2026-07-09" }));
      const raw = storageMock.__store.get(INVOICE_REGISTER_STORAGE_KEY) ?? "{}";
      expect(raw).not.toMatch(/overdue/);
      const [rec] = listInvoices();
      expect(rec).toBeDefined();
      expect("overdue" in (rec as object)).toBe(false);
    });
  });

  // @trace FR-REG-03
  describe("issued snapshot immutability (FR-REG-03)", () => {
    it("clones the snapshot on save: mutating the source does not alter the store", () => {
      const snapshot = buildSnapshot();
      const saved = saveInvoice(buildInput({ snapshot }));

      // Directory edit after issue: the caller mutates its own supplier object.
      snapshot.supplier.ibanEur = "UA00MUTATED";

      expect(getInvoice(saved.id)?.snapshot.supplier.ibanEur).toBe("UA903223130000026007233566020");
    });

    it("read isolation: mutating a getInvoice result does not alter the store", () => {
      const saved = saveInvoice(buildInput());
      const read = getInvoice(saved.id);
      expect(read).not.toBeNull();
      if (read) read.snapshot.customer.name = "TAMPERED";
      expect(getInvoice(saved.id)?.snapshot.customer.name).toBe("Acme Corp");
    });

    it("listInvoices returns deeply-frozen records, isolating the list path too", () => {
      const saved = saveInvoice(buildInput());
      const [listed] = listInvoices();
      expect(listed).toBeDefined();
      // Deep-frozen: a nested mutation must not take effect (throws in strict
      // mode; either way the store is unchanged).
      expect(() => {
        (listed as InvoiceRecord).snapshot.customer.name = "TAMPERED";
      }).toThrow();
      expect(getInvoice(saved.id)?.snapshot.customer.name).toBe("Acme Corp");
    });
  });

  // @trace TC-DATA-01
  describe("browser persistence (TC-DATA-01)", () => {
    it("survives a reload: records re-read from storage after cache reset", () => {
      const saved = saveInvoice(buildInput());
      __resetInvoiceCacheForTests(); // simulate a page reload — cache gone, storage intact
      const reloaded = listInvoices();
      expect(reloaded).toHaveLength(1);
      expect(reloaded[0]?.id).toBe(saved.id);
      expect(reloaded[0]?.invoiceNumber).toBe("2026-001");
    });

    it("falls back to an empty register when stored JSON is corrupt", () => {
      storageMock.__store.set(INVOICE_REGISTER_STORAGE_KEY, "{ not json");
      __resetInvoiceCacheForTests();
      expect(listInvoices()).toEqual([]);
    });

    it("drops individual invalid records but keeps the valid ones", () => {
      const valid = saveInvoice(buildInput({ invoiceNumber: "2026-009" }));
      // Seed a well-formed store whose array mixes the valid record with junk:
      // null, a non-object, and a record with an impossible calendar date.
      storageMock.__store.set(
        INVOICE_REGISTER_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          invoices: [
            null,
            "garbage",
            { ...valid, id: "bad", paymentDeadlineIso: "2026-13-45" },
            valid,
          ],
        })
      );
      __resetInvoiceCacheForTests();
      const kept = listInvoices();
      expect(kept).toHaveLength(1);
      expect(kept[0]?.id).toBe(valid.id);
    });

    it("removes a deleted invoice from storage", () => {
      const saved = saveInvoice(buildInput());
      expect(deleteInvoice(saved.id)).toBe(true);
      __resetInvoiceCacheForTests();
      expect(listInvoices()).toEqual([]);
    });
  });
});
