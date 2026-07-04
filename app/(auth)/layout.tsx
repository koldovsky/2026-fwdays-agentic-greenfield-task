export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-10"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span
            className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white"
            style={{ background: "var(--color-primary)" }}
            aria-hidden
          >
            N
          </span>
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Notely
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
