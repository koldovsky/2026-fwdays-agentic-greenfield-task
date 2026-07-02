// /tailor route — thin App Router leaf (system-design 5.2): renders exactly one
// view slice and nothing else. TailorWorkspace is a client component that owns
// the interactive state; this page stays a server component.
import { TailorWorkspace } from "@/views/tailor-workspace";

export default function TailorPage() {
  return (
    <div className="flex flex-1 justify-center bg-surface-warm px-6 py-12 font-body">
      <main className="w-full max-w-5xl">
        <TailorWorkspace />
      </main>
    </div>
  );
}
