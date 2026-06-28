// @trace FR-LINK-01 FR-LINK-02 FR-LINK-03
import { uk } from "@/lib/i18n/uk";
import { tokenBoundarySchema } from "./schemas";
import { getRespondentCycleByToken } from "./queries";
import { ModeChoice } from "./ModeChoice";
import { ModeStub } from "./ModeStub";

const t = uk.respondent;

type Props = {
  params: Promise<{ token: string }>;
};

function CalmMessagePage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-[var(--space-9)]">
      <div className="max-w-md text-center">
        <p className="font-[var(--weight-medium)] text-ink">{title}</p>
        <p className="mt-[var(--space-4)] text-ink-muted">{body}</p>
      </div>
    </div>
  );
}

/**
 * Public respondent landing page (FR-LINK-01, FR-LINK-03). No authentication.
 * All non-collecting states render the same calm page design — no leaking of
 * cycle existence via HTTP codes or distinct error messages (BC-PRIVACY-02).
 */
export default async function RespondentPage({ params }: Props) {
  const { token } = await params;

  // Validate token format before any DB call (TC-VALID-01, Decision 2).
  // Same calm page for malformed and unknown tokens — no oracle.
  const parseResult = tokenBoundarySchema.safeParse(token);
  if (!parseResult.success) {
    return <CalmMessagePage title={t.notFound} body={t.notFoundBody} />;
  }

  const cycle = await getRespondentCycleByToken(parseResult.data);

  if (cycle === null) {
    return <CalmMessagePage title={t.notFound} body={t.notFoundBody} />;
  }

  if (cycle.status === "done") {
    return <CalmMessagePage title={t.done} body={t.doneBody} />;
  }

  if (cycle.status === "expired") {
    return <CalmMessagePage title={t.expired} body={t.expiredBody} />;
  }

  // status === "collecting"
  if (cycle.mode === null) {
    return (
      <ModeChoice
        token={parseResult.data}
        subjectFirstName={cycle.subjectFirstName}
        methodology={cycle.methodology}
        deadline={cycle.deadline}
      />
    );
  }

  return (
    <ModeStub
      mode={cycle.mode}
      subjectFirstName={cycle.subjectFirstName}
      methodology={cycle.methodology}
      deadline={cycle.deadline}
      daysRemaining={cycle.daysRemaining}
      questions={cycle.questions}
    />
  );
}
