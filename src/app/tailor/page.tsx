// /tailor route — thin App Router leaf (system-design 5.2): renders exactly one
// view slice plus the shell top bar. TailorWorkspace is a client component that
// owns the interactive state; this page stays a server component. The session
// is read here (app layer) and passed down so the top bar shows signed-in vs
// anonymous state — but the route itself is NOT gated: an anonymous visitor
// completes one full tailoring, sign-in appears only at export (FR-ONBOARD-01).
import { auth } from "@/app/auth";
import { TailorWorkspace } from "@/views/tailor-workspace";
import { TopBar } from "@/widgets/top-bar";

export default async function TailorPage() {
  const session = await auth();
  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={session?.user ?? null} />
      <main className="flex flex-1 justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <TailorWorkspace />
        </div>
      </main>
    </div>
  );
}
