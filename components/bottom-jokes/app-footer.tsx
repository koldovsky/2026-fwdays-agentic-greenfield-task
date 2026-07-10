"use client";

import { useMemo } from "react";
import type { CityLocation } from "@/lib/city-search/geocoding";
import {
  buildFooterJokeSeed,
  OPEN_METEO_URL,
  OPENSTREETMAP_URL,
  pickFooterJoke,
} from "@/lib/bottom-jokes/jokes";
import { uk } from "@/lib/i18n/uk";

type AppFooterProps = {
  location: CityLocation | null;
};

export function AppFooter({ location }: AppFooterProps) {
  const joke = useMemo(
    () => pickFooterJoke(buildFooterJokeSeed(location, new Date())),
    [location],
  );

  return (
    <footer className="relative z-10 mx-auto w-full max-w-7xl space-y-3 px-5 pb-8 text-sm text-[#5c6b7a] sm:px-8 dark:text-[#8b9bb0]">
      <p className="leading-7 text-[#1a2332] dark:text-[#e8edf4]">{joke}</p>
      <p className="leading-6">
        {uk.footer.creditsLead}{" "}
        <a
          href={OPEN_METEO_URL}
          className="underline decoration-[#3b6fd9]/40 underline-offset-4 transition hover:text-[#3b6fd9] dark:hover:text-[#6b9fff]"
          target="_blank"
          rel="noreferrer noopener"
        >
          {uk.footer.openMeteoLabel}
        </a>
        {uk.footer.creditsSeparator}
        <a
          href={OPENSTREETMAP_URL}
          className="underline decoration-[#3b6fd9]/40 underline-offset-4 transition hover:text-[#3b6fd9] dark:hover:text-[#6b9fff]"
          target="_blank"
          rel="noreferrer noopener"
        >
          {uk.footer.osmLabel}
        </a>
        .
      </p>
    </footer>
  );
}
