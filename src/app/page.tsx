export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface-warm px-6 font-body">
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <p className="font-mono text-xs tracking-eyebrow uppercase text-ink-muted">
          Honest Resume Tailor
        </p>
        <h1 className="font-display text-5xl leading-tight tracking-tight text-ink">
          Every rewrite stays tied to the truth.
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-ink-soft">
          Vouch rewrites your CV to fit a job description — and grounds every
          claim in your real experience. No invented skills.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="#"
            className="flex h-12 items-center justify-center rounded-md bg-brand px-6 text-base font-medium text-white shadow-brand transition-opacity hover:opacity-[0.88]"
          >
            Tailor my CV — free
          </a>
          <a
            href="#"
            className="flex h-12 items-center justify-center rounded-md border border-hairline bg-surface-card px-6 text-base font-medium text-ink transition-colors hover:border-brand"
          >
            See how it works
          </a>
        </div>
      </main>
    </div>
  );
}
