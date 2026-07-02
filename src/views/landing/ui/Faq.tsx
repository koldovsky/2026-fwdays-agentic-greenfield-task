"use client";

// FAQ accordion (FR-SALES-01, NFR-A11Y-01). The only interactive piece on the
// landing page. Each question is a native <button> exposing aria-expanded and
// controlling its answer via aria-controls; fully keyboard operable. The chevron
// is an arrow character (no icon library — BC-BRAND-01).
import { useId, useState } from "react";
import { faqItems } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

function FaqRow({ question, answer }: { readonly question: string; readonly answer: string }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const btnId = `${baseId}-q`;
  const panelId = `${baseId}-a`;

  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        id={btnId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left font-body text-md font-semibold text-ink"
      >
        {question}
        <span
          aria-hidden="true"
          className={`shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ↓
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        hidden={!open}
        className="pb-5"
      >
        <p className="text-base leading-loose text-ink-soft">{answer}</p>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-y border-hairline bg-surface-card py-16">
      <Wrap>
        <SectionHead kicker="FAQ" title="The honest questions" />
        <div className="max-w-[720px]">
          {faqItems.map((item) => (
            <FaqRow key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </Wrap>
    </section>
  );
}
