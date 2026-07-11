"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { JobStatusPanel } from "@/components/JobStatusPanel";
import { useJobView } from "@/hooks/useJobView";

/**
 * `/jobs` route — renders the WS-driven `JobStatusPanel` for the given
 * job id. The static export cannot host dynamic `/jobs/[id]` segments
 * (no `generateStaticParams` is feasible — job ids are server-generated
 * UUIDs, not enumerable at build time), so the id is read from a
 * `?id=...` query param. The link target is `/jobs?id={id}` from the
 * translation-config + voiceover-config submit handlers.
 *
 * Phase 3 (D-15): the `JobStatusPanel` shows "Translation progress" /
 * "Voice-Over progress" / "Job progress" depending on the job's
 * `job_type`. We fetch the `JobView` (cached after the POST) to read
 * `job_type` and pass it to the panel.
 *
 * Phase 4 (DL-01): the hook now also returns `hasEpubArtifact` +
 * `hasZipArtifact` booleans (derived from `job_type` per
 * 04-UI-SPEC.md §3.1 visibility table). The page forwards them to
 * the panel so the F6 download row only renders for jobs that
 * actually produced the relevant artifact.
 *
 * `useSearchParams` triggers the CSR-bailout in static export; we wrap
 * the inner content in a `<Suspense>` boundary (Next.js 16 requirement).
 */
function JobStatusPageInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams?.get("id");
  const { data, hasEpubArtifact, hasZipArtifact } = useJobView(jobId);
  if (!jobId) {
    return (
      <main className="page">
        <h1 className="page__title">Job not found</h1>
        <p className="page__hint">No job id was provided in the URL.</p>
      </main>
    );
  }
  // The JobView may still be loading (cache miss after a page reload);
  // default to "translation" so the panel renders with a sensible
  // title — the WS events update the panel in real time and a
  // re-render is triggered once the view resolves.
  const jobType = data?.job_type ?? "translation";
  return (
    <main className="page">
      <h1 className="page__title">epubtv</h1>
      <JobStatusPanel
        jobId={jobId}
        jobType={jobType}
        hasEpubArtifact={hasEpubArtifact}
        hasZipArtifact={hasZipArtifact}
        jobStatus={data?.status ?? null}
      />
    </main>
  );
}

export default function JobStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <h1 className="page__title">epubtv</h1>
          <p className="page__hint">Loading job…</p>
        </main>
      }
    >
      <JobStatusPageInner />
    </Suspense>
  );
}
