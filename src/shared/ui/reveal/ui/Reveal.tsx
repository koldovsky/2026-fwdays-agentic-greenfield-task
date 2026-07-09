// Scroll-reveal primitive for restrained landing motion (landing-animations,
// FR-SALES-01, BC-BRAND-01). Progressive enhancement:
//   - SSR renders the content REVEALED (visible without JS, LCP-safe).
//   - On the client, useLayoutEffect hides it before the first post-hydration
//     paint, then an IntersectionObserver reveals it once when it scrolls in.
//   - The transition is "armed" a frame after the hide so the initial hide is
//     never itself animated (no fade-out flash).
//   - prefers-reduced-motion (or no IntersectionObserver) leaves it visible.
// Only opacity/transform animate, so a reveal never shifts layout (CLS stays 0).
// The `fade={false}` variant animates transform only, keeping opacity at 1 so an
// LCP element paints on first render (see globals.css [data-reveal] rules).
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface RevealProps {
  readonly children: ReactNode;
  /** Rendered element (default "div"). Use "section" to reveal a full section. */
  readonly as?: ElementType;
  readonly className?: string;
  /** Stagger delay in ms (drives --reveal-delay). */
  readonly delay?: number;
  /**
   * When false, only transform animates and opacity stays 1, for an
   * above-the-fold / LCP element so it paints on first render. Default true.
   */
  readonly fade?: boolean;
  readonly id?: string;
}

export function Reveal({
  children,
  as,
  className,
  delay,
  fade = true,
  id,
}: RevealProps) {
  const Tag: ElementType = as ?? "div";
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(true); // SSR-visible default
  const [armed, setArmed] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // No motion or no observer support: leave the content visible.
    if (prefersReduced || typeof IntersectionObserver === "undefined") return;

    setRevealed(false); // hide before the first post-hydration paint
    let raf = 0;
    if (typeof requestAnimationFrame === "function") {
      raf = requestAnimationFrame(() => setArmed(true)); // arm transition next frame
    } else {
      setArmed(true);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    observer.observe(el);

    return () => {
      if (raf !== 0 && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(raf);
      }
      observer.disconnect();
    };
  }, []);

  const style =
    delay !== undefined
      ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties)
      : undefined;

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      style={style}
      data-reveal=""
      data-armed={armed ? "true" : undefined}
      data-revealed={revealed ? "true" : "false"}
      data-fade={fade ? "true" : "false"}
    >
      {children}
    </Tag>
  );
}
