import Link from "next/link";
import {
  InvalidGuidError,
  SessionNotFoundError,
  isValidGuid,
  readSession,
} from "@/lib/document-session";
import { WizardShell } from "./wizard-shell";

type PageProps = {
  params: Promise<{ guid: string }>;
};

function ErrorPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="wizard-shell mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ color: "var(--wizard-text)" }}
      >
        {title}
      </h1>
      <p className="mt-3 text-base" style={{ color: "var(--wizard-muted)" }}>
        {detail}
      </p>
      <Link href="/" className="wizard-btn wizard-btn-primary mt-8 w-fit">
        Start a new document
      </Link>
    </main>
  );
}

export default async function DocumentSessionPage({ params }: PageProps) {
  const { guid } = await params;

  if (!isValidGuid(guid)) {
    return (
      <ErrorPanel
        title="Invalid document link"
        detail={`The guid “${guid}” is not a valid session id. No file was created.`}
      />
    );
  }

  let session;
  try {
    session = await readSession(guid);
  } catch (error) {
    if (
      error instanceof SessionNotFoundError ||
      error instanceof InvalidGuidError
    ) {
      return (
        <ErrorPanel
          title="Document not found"
          detail={`No session exists for guid ${guid}. No file was created for this request.`}
        />
      );
    }
    throw error;
  }

  return (
    <WizardShell
      guid={guid}
      initialStep={session["current-step"]}
      completed={session.completed}
      initialDocType={session["doc-type"]}
      initialCopiedFrom={session["copied-from"]}
      initialDate={session.date}
      initialInvoiceNumber={session["invoice-number"]}
      initialActNumber={session["act-number"]}
      initialClient={session.client}
      initialDoneBy={session["done-by"]}
      initialServices={session.services}
    />
  );
}
