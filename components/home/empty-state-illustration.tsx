export function EmptyStateIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 80"
      className="mx-auto h-20 w-30 text-accent-subtle"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="16" width="104" height="48" rx="12" stroke="currentColor" strokeWidth="2" />
      <circle cx="36" cy="40" r="10" fill="currentColor" opacity="0.35" />
      <path
        d="M56 34h40M56 40h28M56 46h34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
