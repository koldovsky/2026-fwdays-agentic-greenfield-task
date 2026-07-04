import Image from "next/image";
import Link from "next/link";

import { SiteHeaderWithAuth } from "@/components/shell/site-header-auth";

export default function Home() {
  return (
    <>
      <SiteHeaderWithAuth active="home" />
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-violet-50">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-16 text-center sm:px-6 sm:py-24 lg:flex-row lg:text-left">
            <div className="colibri-flight flex-shrink-0">
              <Image
                src="/colibri-logo.png"
                alt="Colibri — outdoor activity booking"
                width={902}
                height={805}
                unoptimized
                className="mx-auto h-44 w-auto object-contain drop-shadow-[0_12px_28px_rgba(109,40,217,0.15)] sm:h-52 lg:mx-0 lg:h-56"
                priority
              />
            </div>
            <div className="max-w-xl space-y-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">
                Mahogany HOA · Outdoor booking
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Book outdoor life,
                <span className="block text-violet-700">in plain language.</span>
              </h1>
              <p className="text-lg leading-relaxed text-zinc-600">
                Colibri turns &ldquo;Friday morning tennis, any 45-minute slot&rdquo; into a
                confirmed reservation on mahoganyhoa.com — courts, picnic sites, and more
                coming soon.
              </p>
              <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link
                  href="/book"
                  className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-700 hover:to-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                >
                  Start a booking
                </Link>
                <a
                  href="https://mahoganyhoa.com/facilities/outdoor/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-300 bg-white/80 px-8 py-3.5 text-sm font-medium text-zinc-700 backdrop-blur transition hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                >
                  MHOA outdoor facilities
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-emerald-950">
            How it works
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell us when",
                body: "Enter your details and describe the booking in everyday language.",
              },
              {
                step: "2",
                title: "We parse & validate",
                body: "Colibri maps your request to MHOA rules and available slots.",
              },
              {
                step: "3",
                title: "We submit for you",
                body: "Forms and captcha on mahoganyhoa.com — handled on your behalf.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
                  {item.step}
                </span>
                <h3 className="mt-4 font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        3B Digital Consulting Inc · Greenfield
      </footer>
    </>
  );
}
