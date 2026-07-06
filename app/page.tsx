import { LandingForm } from "./components/LandingForm";
import { strings } from "@/lib/strings";

// Landing (FR-SHELL-01, FR-LAND-01/02). Centered three-tier hero over the inline
// entry row. No user is fetched until the visitor acts.
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="ds-fade-up flex flex-col items-center gap-5">
        <p className="font-serif text-body italic text-text-muted">
          {strings.landing.eyebrow}
        </p>
        <h1 className="max-w-4xl font-serif text-display leading-[1.05]">
          {strings.landing.headline}
        </h1>
        <p className="max-w-xl font-sans text-text-muted">{strings.landing.sub}</p>
      </div>

      <div className="ds-fade-up w-full" style={{ animationDelay: "0.08s" }}>
        <LandingForm />
      </div>
    </div>
  );
}
