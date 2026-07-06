import type { Metadata } from "next";
import Link from "next/link";
import { getUserStats, type FetchResult } from "@/lib/github/client";
import { scoreBattle } from "@/lib/scoring/battle";
import { BattleReveal, type SideProfile } from "@/app/components/BattleReveal";
import type { UserStats } from "@/lib/types";
import { strings } from "@/lib/strings";

// Both usernames live in the path, so a battle is a shareable, deep-linkable URL
// (FR-BATTLE-05). Both users are fetched in parallel server-side (FR-BATTLE-01);
// if either fails the page degrades to a per-side error state (FR-BATTLE-06).
export async function generateMetadata({
  params,
}: PageProps<"/battle/[user1]/[user2]">): Promise<Metadata> {
  const { user1, user2 } = await params;
  return { title: `${user1} vs ${user2} — ${strings.brand.name}` };
}

function toSide(stats: UserStats): SideProfile {
  return {
    login: stats.profile.login,
    name: stats.profile.name,
    avatarUrl: stats.profile.avatarUrl,
  };
}

export default async function BattlePage({ params }: PageProps<"/battle/[user1]/[user2]">) {
  const { user1, user2 } = await params;
  const [a, b] = await Promise.all([getUserStats(user1), getUserStats(user2)]);

  if (a.status === "ok" && b.status === "ok") {
    const result = scoreBattle(a.data, b.data);
    return <BattleReveal a={toSide(a.data)} b={toSide(b.data)} result={result} />;
  }

  return (
    <div className="mx-auto w-full max-w-content px-6 py-16">
      <p className="mb-8 text-center font-sans text-body text-text-muted">
        This battle couldn&rsquo;t run — one side didn&rsquo;t load.
      </p>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
        <SideStatus login={user1} result={a} accent="var(--accent-primary)" />
        <SideStatus login={user2} result={b} accent="var(--accent-secondary)" />
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex rounded-md border border-border px-[22px] py-[11px] font-sans text-small font-semibold text-text transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {strings.states.back}
        </Link>
      </div>
    </div>
  );
}

// One combatant's load status — a green light or an explicit, specific error
// (FR-BATTLE-06). Never a crash.
function SideStatus({
  login,
  result,
  accent,
}: {
  login: string;
  result: FetchResult<UserStats>;
  accent: string;
}) {
  const ok = result.status === "ok";
  const detail =
    result.status === "not-found"
      ? strings.states.notFoundBody(login)
      : result.status === "rate-limited"
        ? strings.states.rateLimitTitle
        : result.status === "error"
          ? strings.states.genericErrorBody
          : null;

  return (
    <div className="bg-surface px-6 py-8 text-center font-sans">
      <div className="font-serif text-h2" style={{ color: ok ? accent : "var(--text)" }}>
        @{login}
      </div>
      {ok ? (
        <p className="mt-2 text-small text-text-muted">Loaded</p>
      ) : (
        <>
          <p className="mt-2 text-small font-semibold text-accent-danger">
            {strings.battle.sideErrorPrefix}
          </p>
          <p className="mt-1 text-small text-text-muted">{detail}</p>
        </>
      )}
    </div>
  );
}
