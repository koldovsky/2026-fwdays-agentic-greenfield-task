import type { Metadata } from "next";
import { getUserStats } from "@/lib/github/client";
import { StatsView } from "@/app/components/StatsView";
import { NotFoundCard, RateLimitCard, GenericErrorCard } from "@/app/components/StateCard";
import { strings } from "@/lib/strings";

// The username lives in the path, so this view is a shareable, deep-linkable URL
// (FR-STATS-04). Data is fetched server-side (TC-DATA-01); the sibling loading.tsx
// provides the skeleton (FR-STATS-05).
export async function generateMetadata({
  params,
}: PageProps<"/stats/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username} — ${strings.brand.name}` };
}

export default async function StatsPage({ params }: PageProps<"/stats/[username]">) {
  const { username } = await params;
  const result = await getUserStats(username);

  switch (result.status) {
    case "ok":
      return <StatsView stats={result.data} />;
    case "not-found": // FR-DATA-06: in-page state, not an error boundary
      return <NotFoundCard login={username} />;
    case "rate-limited": // FR-DATA-05
      return <RateLimitCard />;
    default:
      return <GenericErrorCard />;
  }
}
