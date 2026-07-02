// /sign-in route — thin App Router leaf (system-design 5.2): session check +
// one view slice (FR-AUTH-01). An already-signed-in user is sent to /tailor.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId } from "@/app/auth";
import { t } from "@/shared/lib/i18n";
import { SignInView } from "@/views/auth";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("uk").auth.signInTitle,
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  if ((await currentUserId()) !== null) redirect("/tailor");
  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar />
      <main className="flex flex-1 justify-center px-6 py-12">
        <SignInView />
      </main>
    </div>
  );
}
