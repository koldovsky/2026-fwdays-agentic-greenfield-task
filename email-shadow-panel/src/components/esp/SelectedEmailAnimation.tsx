import { useEffect, useMemo, useState } from "react";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  getPhaseDuration,
  getPhaseOffset,
  SELECTED_EMAIL_TOTAL,
  type SelectedEmailPhase,
} from "@/lib/selectedEmailTimeline";

interface Props {
  activating?: boolean;
}

type Sample = {
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  body: string;
  code: string;
  tag: string;
  receivedAt: string;
};

const SAMPLES: Sample[] = [
  {
    from: "no-reply@github.com",
    fromName: "GitHub",
    subject: "Sign-in verification code",
    preview: "Someone tried to sign in to your account...",
    body: "Hi operator,\n\nUse the following code to finish signing in. It expires in 10 minutes.\n\n  -> code: 481-902\n\nIf this wasn't you, ignore this message.",
    code: "481-902",
    tag: "OTP",
    receivedAt: "just now",
  },
  {
    from: "security@stripe.com",
    fromName: "Stripe",
    subject: "Your one-time login code",
    preview: "Use this code to continue signing in to Stripe.",
    body: "Your Stripe one-time code:\n\n  -> 620-118\n\nThis code is valid for 5 minutes. Do not share it with anyone.",
    code: "620-118",
    tag: "OTP",
    receivedAt: "12s",
  },
  {
    from: "accounts@vercel.com",
    fromName: "Vercel",
    subject: "Verify your login",
    preview: "Enter the code below in the login window.",
    body: "Your Vercel verification code:\n\n  -> 774-039\n\nExpires in 15 minutes. Requested from Berlin, DE.",
    code: "774-039",
    tag: "VERIFY",
    receivedAt: "4s",
  },
];

const QUEUE = [
  { name: "GitHub", subj: "Sign-in verification code", t: "now" },
  { name: "Stripe", subj: "Your one-time login code", t: "12s" },
  { name: "Vercel", subj: "Verify your login", t: "34s" },
  { name: "Discord", subj: "Confirm your email", t: "1m" },
] as const;

const PHASES: SelectedEmailPhase[] = ["land", "select", "open", "type", "extract", "hold"];

function hasOpened(phase: SelectedEmailPhase) {
  return phase === "open" || phase === "type" || phase === "extract" || phase === "hold";
}

function hasExtracted(phase: SelectedEmailPhase) {
  return phase === "extract" || phase === "hold";
}

export function SelectedEmailAnimation({ activating }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<SelectedEmailPhase>("land");
  const [typedCount, setTypedCount] = useState(0);

  const sample = SAMPLES[idx % SAMPLES.length];
  const speed = activating ? 1.65 : 1;

  useEffect(() => {
    if (reducedMotion) {
      setPhase("hold");
      setTypedCount(sample.body.length);
      return;
    }

    setPhase("land");
    setTypedCount(0);

    const timers = PHASES.map((nextPhase) =>
      setTimeout(() => setPhase(nextPhase), Math.max(0, getPhaseOffset(nextPhase) / speed)),
    );
    const swapTimer = setTimeout(() => {
      setIdx((cur) => (cur + 1) % SAMPLES.length);
    }, SELECTED_EMAIL_TOTAL / speed);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(swapTimer);
    };
  }, [idx, reducedMotion, sample.body.length, speed]);

  useEffect(() => {
    if (reducedMotion) {
      setTypedCount(sample.body.length);
      return;
    }

    if (phase === "type") {
      const duration = getPhaseDuration("type") / speed;
      const startedAt = performance.now();
      const timer = window.setInterval(
        () => {
          const progress = Math.min(1, (performance.now() - startedAt) / duration);
          setTypedCount(Math.floor(progress * sample.body.length));
          if (progress >= 1) window.clearInterval(timer);
        },
        activating ? 24 : 34,
      );
      return () => window.clearInterval(timer);
    }

    if (phase === "extract" || phase === "hold") {
      setTypedCount(sample.body.length);
    } else {
      setTypedCount(0);
    }
  }, [activating, phase, reducedMotion, sample.body.length, speed]);

  const typedBody = useMemo(() => sample.body.slice(0, typedCount), [sample.body, typedCount]);

  const extractOn = hasExtracted(phase);
  const stampOn = phase === "hold";
  const opened = hasOpened(phase);
  const selectedQueueIdx = idx % QUEUE.length;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 esp-stage-glow" />

      <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <div className="flex items-center gap-2 text-signal/80">
            <Mail className="size-3.5" />
            <span>inbox / preview</span>
          </div>
          <span className={activating ? "text-signal" : "text-muted-foreground/70"}>
            {reducedMotion ? "reduced motion" : activating ? "streaming" : "demo loop"}
          </span>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[96px_1fr]">
          <ul className="hidden flex-col gap-1 font-mono-tabular text-[10px] sm:flex">
            {QUEUE.map((q, i) => {
              const selected = i === selectedQueueIdx;
              return (
                <li
                  key={q.name}
                  className={`relative rounded-sm border px-2 py-1.5 transition-all duration-300 ${
                    selected
                      ? "border-signal/60 bg-signal/10 text-foreground"
                      : "border-hairline/60 bg-background/30 text-muted-foreground/70"
                  }`}
                >
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-[-1px] top-1 w-[2px] bg-signal shadow-[0_0_10px_var(--signal)]"
                    />
                  )}
                  <div className="truncate text-[10px] uppercase tracking-[0.14em]">{q.name}</div>
                  <div className="truncate text-[9.5px] opacity-70">{q.subj}</div>
                  <div className="mt-0.5 text-[9px] opacity-50">{q.t}</div>
                </li>
              );
            })}
          </ul>

          <div className="relative min-h-0 overflow-hidden rounded-sm border border-hairline bg-background/50">
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-0 h-full transition-opacity duration-300 ${
                phase === "select" && !reducedMotion
                  ? "opacity-100 esp-selection-sweep"
                  : "opacity-0"
              }`}
            />

            <div key={idx} className="relative h-full w-full p-3 sm:p-4">
              <div
                className={`relative mx-auto w-full max-w-[320px] transition-all duration-500 ${
                  phase === "land" && !reducedMotion
                    ? "-translate-y-6 opacity-0"
                    : "translate-y-0 opacity-100"
                }`}
              >
                <div className="relative">
                  <div
                    className={`absolute left-3 right-3 rounded-sm border border-hairline bg-surface-raised shadow-panel transition-all duration-700 ${
                      opened ? "-top-2 translate-y-0 opacity-100" : "top-3 translate-y-3 opacity-0"
                    }`}
                    style={{ zIndex: opened ? 3 : 1 }}
                  >
                    <div className="border-b border-hairline/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 font-mono-tabular text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                        <span className="truncate">from / {sample.from}</span>
                        <span>{sample.receivedAt}</span>
                      </div>
                      <div className="mt-1 truncate text-[12.5px] text-foreground">
                        {sample.subject}
                      </div>
                    </div>
                    <pre className="min-h-[68px] max-h-[112px] overflow-hidden whitespace-pre-wrap px-3 py-2 font-mono-tabular text-[10.5px] leading-[1.45] text-muted-foreground">
                      {typedBody}
                      {phase === "type" && !reducedMotion && <span className="cursor-blink" />}
                    </pre>
                  </div>

                  <div className="relative h-[96px] overflow-hidden rounded-sm border border-hairline bg-surface sm:h-[108px]">
                    <div aria-hidden className="absolute inset-0 opacity-40 esp-envelope-lines" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-3 font-mono-tabular text-[10px] text-signal/80">
                      <span className="truncate">{sample.fromName}</span>
                      <span className="rounded-sm border border-signal/40 bg-signal/10 px-1.5 py-[1px] text-[9px] uppercase tracking-[0.18em] text-signal">
                        {sample.tag}
                      </span>
                    </div>
                  </div>

                  <div
                    aria-hidden
                    className="absolute left-0 right-0 top-0 origin-top transition-transform duration-700 ease-out"
                    style={{
                      transformStyle: "preserve-3d",
                      perspective: "600px",
                      zIndex: 2,
                      transform: opened
                        ? "perspective(600px) rotateX(-170deg)"
                        : "perspective(600px) rotateX(0deg)",
                    }}
                  >
                    <div className="mx-auto h-[52px] esp-envelope-flap" />
                  </div>
                </div>
              </div>

              <div
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 transition-all duration-500 ${
                  extractOn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
                style={{ bottom: 10 }}
              >
                <div className="relative rounded-sm border border-signal/60 bg-background/85 px-3 py-1.5 shadow-[0_0_24px_-6px_var(--signal)]">
                  <div className="flex items-center gap-2 font-mono-tabular text-[9.5px] uppercase tracking-[0.24em] text-signal">
                    <Sparkles className="size-3" />
                    detected code
                  </div>
                  <div className="mt-0.5 font-mono-tabular text-[16px] tracking-[0.24em] text-foreground">
                    {sample.code}
                  </div>
                  <div
                    className={`absolute -right-3 -top-3 rotate-[-14deg] rounded-sm border-2 border-primary/80 px-1.5 py-[1px] font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-primary transition-all duration-300 ${
                      stampOn ? "scale-100 opacity-100" : "scale-125 opacity-0"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="size-3" />
                      verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div aria-hidden className="pointer-events-none absolute inset-0 esp-panel-scanline" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">
          <span>
            phase / <span className="text-signal">{phase}</span>
          </span>
          <span>
            msg {String((idx % SAMPLES.length) + 1).padStart(2, "0")} /{" "}
            {String(SAMPLES.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
