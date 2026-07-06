"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { BattleResult, MetricOutcome } from "@/lib/types";
import { METRICS } from "@/lib/metrics/catalog";
import { strings } from "@/lib/strings";
import { Confetti } from "./Confetti";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Reads prefers-reduced-motion via an external store, so no setState-in-effect is
// needed and the server render assumes motion is allowed (false).
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

export interface SideProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
}

const STAGGER_MS = 240; // signature reveal cadence (DESIGN.md)
const CONFETTI_MS = 3000;
const labelByKey = new Map(METRICS.map((m) => [m.key, m.label]));
const formatByKey = new Map(METRICS.map((m) => [m.key, m.format]));

function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function runningScore(outcomes: MetricOutcome[], side: "a" | "b"): number {
  return outcomes.reduce((s, o) => {
    if (o.winner === side) return s + 1;
    if (o.winner === "draw") return s + 0.5;
    return s;
  }, 0);
}

// The battle reveal (FR-BATTLE-02/03/04/07). Rows reveal on a stagger, the score
// counts up as they land, winning values pulse, then the banner pops and confetti
// falls. Under prefers-reduced-motion the whole sequence collapses to the final
// state and confetti never mounts.
export function BattleReveal({
  a,
  b,
  result,
}: {
  a: SideProfile;
  b: SideProfile;
  result: BattleResult;
}) {
  const total = result.outcomes.length;
  const reduced = usePrefersReducedMotion();
  // `tick` drives the staggered reveal; under reduced motion we skip straight to
  // the final state (FR-BATTLE-07).
  const [tick, setTick] = useState(0);
  const [confettiSpent, setConfettiSpent] = useState(false);
  const revealed = reduced ? total : Math.min(tick, total);
  const done = revealed >= total;

  useEffect(() => {
    if (reduced) return; // nothing to animate
    const id = setInterval(() => setTick((t) => t + 1), STAGGER_MS);
    return () => clearInterval(id);
  }, [reduced]);

  const showConfetti = !reduced && done && result.winner !== "draw" && !confettiSpent;
  useEffect(() => {
    if (!showConfetti) return;
    const id = setTimeout(() => setConfettiSpent(true), CONFETTI_MS);
    return () => clearTimeout(id);
  }, [showConfetti]);

  const shown = result.outcomes.slice(0, revealed);
  const scoreA = runningScore(shown, "a");
  const scoreB = runningScore(shown, "b");

  return (
    <div className="mx-auto w-full max-w-content px-6 py-10">
      {showConfetti && <Confetti />}

      <ScoreHeader a={a} b={b} scoreA={scoreA} scoreB={scoreB} />

      <div className="mt-10 overflow-hidden rounded-xl border border-border">
        {result.outcomes.map((outcome, i) => (
          <Row key={outcome.key} outcome={outcome} visible={i < revealed} />
        ))}
      </div>

      <div className="mt-8 min-h-[32px] text-center">
        {done && <WinnerBanner winner={result.winner} a={a} b={b} />}
      </div>
    </div>
  );
}

function ScoreHeader({
  a,
  b,
  scoreA,
  scoreB,
}: {
  a: SideProfile;
  b: SideProfile;
  scoreA: number;
  scoreB: number;
}) {
  return (
    <div className="text-center font-sans">
      <div className="text-small uppercase tracking-[0.04em] text-text-muted">
        {strings.battle.eyebrow}
      </div>
      <div className="mt-3.5 flex items-center justify-center gap-5 sm:gap-[22px]">
        <Combatant profile={a} align="right" />
        <span className="font-serif text-[22px] italic text-text-muted">
          {strings.battle.versus}
        </span>
        <Combatant profile={b} align="left" />
      </div>
      <div className="mt-4 font-serif text-[44px] leading-none">
        <span className="text-accent-primary">{fmtScore(scoreA)}</span>
        <span className="mx-3 text-[26px] text-text-muted">—</span>
        <span className="text-accent-secondary">{fmtScore(scoreB)}</span>
      </div>
    </div>
  );
}

function Combatant({ profile, align }: { profile: SideProfile; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-2.5 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <Image
        src={profile.avatarUrl}
        alt=""
        width={52}
        height={52}
        className="size-[52px] rounded-full border border-border"
        unoptimized
      />
      <span className="font-serif text-[22px]">{profile.name ?? profile.login}</span>
    </div>
  );
}

function Row({ outcome, visible }: { outcome: MetricOutcome; visible: boolean }) {
  const label = labelByKey.get(outcome.key) ?? outcome.key;
  const format = formatByKey.get(outcome.key) ?? String;
  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-center transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <Cell
        value={format(outcome.aValue)}
        win={outcome.winner === "a"}
        pulse={visible && outcome.winner === "a"}
        align="right"
        color="var(--accent-primary)"
      />
      <div className="bg-surface-track px-2 py-[15px] text-center font-sans text-small text-text-muted sm:px-4">
        {label}
      </div>
      <Cell
        value={format(outcome.bValue)}
        win={outcome.winner === "b"}
        pulse={visible && outcome.winner === "b"}
        align="left"
        color="var(--accent-secondary)"
      />
    </div>
  );
}

function Cell({
  value,
  win,
  pulse,
  align,
  color,
}: {
  value: string;
  win: boolean;
  pulse: boolean;
  align: "left" | "right";
  color: string;
}) {
  return (
    <div
      className="px-4 py-[15px] font-serif text-[22px] sm:px-5"
      style={{
        textAlign: align,
        color: win ? color : "var(--text-muted)",
        fontWeight: win ? 600 : 400,
        animation: pulse ? "ds-win-pulse var(--dur-med) var(--ease-out)" : undefined,
      }}
    >
      {value}
    </div>
  );
}

function WinnerBanner({
  winner,
  a,
  b,
}: {
  winner: BattleResult["winner"];
  a: SideProfile;
  b: SideProfile;
}) {
  const color =
    winner === "a"
      ? "var(--accent-primary)"
      : winner === "b"
        ? "var(--accent-secondary)"
        : "var(--text-muted)";
  const name = winner === "a" ? (a.name ?? a.login) : winner === "b" ? (b.name ?? b.login) : null;

  return (
    <div
      className="font-serif text-[20px] italic"
      style={{ color, animation: "ds-pop var(--dur-slow) var(--ease-out) both" }}
    >
      {winner === "draw" ? (
        strings.battle.draw
      ) : (
        <>
          {strings.battle.winnerPrefix} · <strong className="font-semibold">{name}</strong>
        </>
      )}
    </div>
  );
}
