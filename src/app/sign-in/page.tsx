// /sign-in route — thin App Router leaf (system-design 5.2): session check +
// one view slice (FR-AUTH-01). An already-signed-in user is sent to /tailor.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUserId } from "@/app/auth";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { SignInView } from "@/views/auth";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("ua").auth.signInTitle,
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if ((await currentUserId()) !== null) redirect("/tailor");
  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar locale={locale} />
      <main className="flex flex-1 justify-center px-6 py-12">
        <SignInView locale={locale} />
      </main>
    </div>
  );
}
