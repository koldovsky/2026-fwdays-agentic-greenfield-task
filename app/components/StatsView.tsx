import Image from "next/image";
import type { UserStats } from "@/lib/types";
import { METRICS } from "@/lib/metrics/catalog";
import { formatCompact } from "@/lib/metrics/format";
import { strings } from "@/lib/strings";
import { LanguageDonut } from "./LanguageDonut";
import { ActivityChart } from "./ActivityChart";
import { ReachBar } from "./ReachBar";
import { RepoSplit } from "./RepoSplit";
import { Panel } from "./Panel";
import { TopRepos } from "./TopRepos";

// Single-user stats dashboard: profile, fifteen metric cards, and CSS charts —
// language breakdown, recent activity, reach & influence, repository composition
// (FR-STATS-*, FR-LANG-*, user-stats charts). A server component; reveal is pure
// CSS and respects reduced motion.
export function StatsView({ stats }: { stats: UserStats }) {
  const { metrics, languages } = stats;

  const activity = [
    { label: strings.stats.commits, value: metrics.commitActivity },
    { label: strings.stats.pullRequests, value: metrics.prActivity },
    { label: strings.stats.issues, value: metrics.issueActivity },
    { label: strings.stats.releases, value: metrics.releases },
  ];
  const reach = [
    { label: strings.stats.stars, value: metrics.totalStars, display: formatCompact(metrics.totalStars) },
    { label: strings.stats.forks, value: metrics.totalForks, display: formatCompact(metrics.totalForks) },
    { label: strings.stats.watchers, value: metrics.totalWatchers, display: formatCompact(metrics.totalWatchers) },
    { label: strings.stats.followers, value: metrics.followers, display: formatCompact(metrics.followers) },
  ];
  const totalRepos = metrics.originalRepos + metrics.forkedRepos;

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-6 py-10">
      <ProfileHeader stats={stats} />

      {/* Fifteen metrics as a ledger of cards, staggered on load (FR-STATS-03) */}
      <div className="rounded-xl border border-border bg-surface p-2">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-3 lg:grid-cols-6">
          {METRICS.map((def, i) => (
            <div
              key={def.key}
              className="ds-fade-up bg-surface px-4 py-[18px]"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="font-sans text-caption text-text-muted">{def.label}</div>
              <div className="mt-2.5 font-serif text-[32px] leading-none">
                {def.format(metrics[def.key])}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language breakdown + recent activity, side by side on wider screens */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={strings.stats.languagesTitle} className="ds-fade-up" >
          <LanguageDonut languages={languages} />
        </Panel>
        <Panel
          title={strings.stats.activityTitle}
          subtitle={strings.stats.activitySub}
          className="ds-fade-up"
        >
          <ActivityChart data={activity} />
        </Panel>
      </div>

      <Panel title={strings.stats.reachTitle} className="ds-fade-up">
        <ReachBar data={reach} />
      </Panel>

      <Panel
        title={strings.stats.repoTitle}
        meta={strings.stats.repoMeta(totalRepos)}
        className="ds-fade-up"
      >
        <RepoSplit original={metrics.originalRepos} forked={metrics.forkedRepos} />
      </Panel>

      <div className="ds-fade-up">
        <TopRepos login={stats.login} repos={stats.topRepos} />
      </div>
    </div>
  );
}

function ProfileHeader({ stats }: { stats: UserStats }) {
  const { profile, metrics } = stats;
  const joinedYear = new Date(profile.createdAt).getFullYear();

  return (
    <header className="flex flex-col items-start gap-6 border-b border-border pb-7 sm:flex-row">
      <Image
        src={profile.avatarUrl}
        alt=""
        width={112}
        height={112}
        className="size-[112px] shrink-0 rounded-full border border-border"
        unoptimized
      />
      <div className="flex-1">
        <h1 className="font-serif text-h1 leading-tight">{profile.name ?? profile.login}</h1>
        <a
          href={profile.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="font-sans text-body text-text-muted underline decoration-border underline-offset-4 transition-colors hover:text-text"
        >
          @{profile.login}
        </a>
        {profile.bio && (
          <p className="mt-3 max-w-2xl font-sans text-body text-text">{profile.bio}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-sans text-small text-text-muted">
          {profile.location && <span>{profile.location}</span>}
          <span>{strings.stats.joined(joinedYear)}</span>
          <span>
            {strings.stats.followersMeta(formatCompact(metrics.followers))} ·{" "}
            {strings.stats.followingMeta(formatCompact(metrics.following))}
          </span>
          {profile.company && <span>{profile.company}</span>}
          {profile.blog && (
            <a
              href={profile.blog}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-text"
            >
              {profile.blog.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
