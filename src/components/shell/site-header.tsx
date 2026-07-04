"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { SessionUser } from "@/lib/auth/types";

type SiteHeaderProps = {
  active?: "home" | "book" | "bookings" | "scheduled" | "admin";
  user?: SessionUser | null;
};

export function SiteHeader({ active = "home", user = null }: SiteHeaderProps) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/colibri-logo.png"
            alt="Colibri Outdoor Booking"
            width={902}
            height={805}
            unoptimized
            className="h-11 w-auto object-contain transition-transform group-hover:scale-105"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-emerald-950">
            Colibri
            <span className="font-normal text-violet-600"> Book</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium">
          <Link
            href="/"
            className={`rounded-full px-4 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
              active === "home"
                ? "bg-emerald-50 text-emerald-900"
                : "text-zinc-600 hover:text-emerald-900"
            }`}
          >
            Home
          </Link>
          <Link
            href="/book"
            className={`rounded-full px-4 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
              active === "book"
                ? "bg-violet-100 text-violet-900"
                : "text-zinc-600 hover:text-violet-900"
            }`}
          >
            Book
          </Link>
          <Link
            href="/bookings"
            className={`rounded-full px-4 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
              active === "bookings"
                ? "bg-emerald-100 text-emerald-900"
                : "text-zinc-600 hover:text-emerald-900"
            }`}
          >
            My bookings
          </Link>
          <Link
            href="/scheduled"
            className={`rounded-full px-4 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
              active === "scheduled"
                ? "bg-amber-100 text-amber-900"
                : "text-zinc-600 hover:text-amber-900"
            }`}
          >
            Scheduled
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`rounded-full px-4 py-2 transition-colors ${
                active === "admin"
                  ? "bg-amber-100 text-amber-900"
                  : "text-zinc-600 hover:text-amber-900"
              }`}
            >
              Admin
            </Link>
          )}
          {user && (
            <span className="hidden px-2 text-xs text-zinc-500 sm:inline">{user.username}</span>
          )}
          {user && (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-zinc-200 px-4 py-2 text-zinc-600 hover:border-zinc-300"
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
