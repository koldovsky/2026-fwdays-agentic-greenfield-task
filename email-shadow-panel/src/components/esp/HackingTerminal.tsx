import { useEffect, useRef, useState } from "react";

/**
 * A "fancy hacking terminal" panel that replaces the previous 3D gateway.
 * Pure DOM + CSS — no WebGL, no external deps. Streams pseudo log lines,
 * shows a matrix rain column, a mock handshake progress, and reacts to
 * `activating` by flooding with a boot sequence.
 */

interface Props {
  activating?: boolean;
}

const IDLE_LINES: string[] = [
  "$ shadowd --listen 0.0.0.0:2525",
  "[boot] loading provider: emailnator",
  "[boot] adapter=mock  region=eu-west",
  "[net]  probing relays … 4/4 ok",
  "[tls]  handshake ready · cipher=chacha20-poly1305",
  "[dns]  MX cache primed (12 entries)",
  "[idle] awaiting operator input …",
  "$ _",
];

const BOOT_LINES: string[] = [
  "> OPEN CHANNEL --provider emailnator",
  "[auth]  requesting anonymous token …",
  "[auth]  token=sha256:9f2c…d41e  ok",
  "[relay] resolving pool → 3 candidates",
  "[relay] selected  node-07.eu.shadow",
  "[mint]  generating mailbox alias …",
  "[mint]  entropy=256b  collision=0",
  "[bind]  binding inbox to session slot",
  "[sync]  subscribing to push stream",
  "[sync]  SSE connected  hb=30s",
  "[ok]    channel ONLINE",
];

const HEX = "0123456789ABCDEF";
const GLYPHS = "アカサタナ01#$%&*+=<>/\\|{}[]?";

function randHex(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}
function randGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

export function HackingTerminal({ activating }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [rain, setRain] = useState<string[]>(() =>
    Array.from({ length: 14 }, () => Array.from({ length: 22 }, randGlyph).join("")),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stream log lines. When activating, use boot script + fast cadence.
  useEffect(() => {
    let i = 0;
    let cancelled = false;
    const script = activating ? BOOT_LINES : IDLE_LINES;
    const delay = activating ? 90 : 520;

    setLines([]);
    setProgress(activating ? 0 : 68);

    const tick = () => {
      if (cancelled) return;
      setLines((cur) => {
        const next = [...cur, script[i % script.length]];
        return next.slice(-14);
      });
      if (activating) {
        setProgress((p) => Math.min(100, p + 100 / (BOOT_LINES.length + 1)));
      }
      i += 1;
      if (!activating || i < BOOT_LINES.length + 4) {
        setTimeout(tick, delay + Math.random() * (activating ? 60 : 220));
      }
    };
    const first = setTimeout(tick, 120);
    return () => {
      cancelled = true;
      clearTimeout(first);
    };
  }, [activating]);

  // Matrix rain — rotate one column per frame.
  useEffect(() => {
    const id = setInterval(
      () => {
        setRain((cols) =>
          cols.map((c, idx) =>
            idx === Math.floor(Math.random() * cols.length) ? randGlyph() + c.slice(0, -1) : c,
          ),
        );
      },
      activating ? 55 : 130,
    );
    return () => clearInterval(id);
  }, [activating]);

  // Auto-scroll log
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  const bars = 28;
  const filled = Math.round((progress / 100) * bars);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* matrix rain backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex justify-between px-3 pt-3 gap-1 opacity-[0.18]"
        style={{
          maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
        }}
      >
        {rain.map((col, i) => (
          <div
            key={i}
            className="font-mono-tabular text-[10px] leading-[1.15] whitespace-pre text-signal"
            style={{
              writingMode: "vertical-rl",
              transform: `translateY(${(i % 5) * 6}px)`,
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* CRT vignette + subtle glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--signal) 10%, transparent), transparent 70%)",
        }}
      />

      {/* content */}
      <div className="relative z-10 flex h-full flex-col p-5 sm:p-6">
        {/* header bar */}
        <div className="flex items-center justify-between font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-destructive/80" />
            <span className="inline-block size-1.5 rounded-full bg-amber/80" />
            <span className="inline-block size-1.5 rounded-full bg-signal" />
            <span className="ml-2 text-signal/80">tty0 · shadowd</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>uid={randHex(4)}</span>
            <span>rtt=12ms</span>
            <span className={activating ? "text-signal" : "text-muted-foreground/70"}>
              {activating ? "● LIVE" : "○ idle"}
            </span>
          </div>
        </div>

        {/* log stream */}
        <div
          ref={scrollRef}
          className="mt-3 flex-1 overflow-hidden rounded-sm border border-hairline bg-background/50 p-3 font-mono-tabular text-[11.5px] leading-[1.55]"
        >
          {lines.map((l, i) => {
            const isCmd = l.startsWith("$") || l.startsWith(">");
            const isOk = l.includes(" ok") || l.startsWith("[ok]");
            const isWarn = l.startsWith("[boot]") || l.startsWith("[auth]");
            const cls = isCmd
              ? "text-signal"
              : isOk
                ? "text-primary"
                : isWarn
                  ? "text-amber"
                  : "text-muted-foreground";
            const isLast = i === lines.length - 1;
            return (
              <div key={i} className={cls}>
                <span className="text-muted-foreground/40 mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {l}
                {isLast && <span className="cursor-blink" />}
              </div>
            );
          })}
        </div>

        {/* footer: progress + target */}
        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between font-mono-tabular text-[10px] uppercase tracking-[0.24em]">
            <span className="text-muted-foreground">
              {activating ? "opening channel" : "channel idle"}
            </span>
            <span className="text-signal">{Math.round(progress)}%</span>
          </div>
          <div className="font-mono-tabular text-[11px] leading-none text-signal/90 select-none">
            [<span className="text-signal">{"█".repeat(filled)}</span>
            <span className="text-signal/25">{"·".repeat(bars - filled)}</span>]
          </div>
          <div className="flex items-center justify-between font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">
            <span>target · node-07.eu.shadow</span>
            <span>sess · {randHex(8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
