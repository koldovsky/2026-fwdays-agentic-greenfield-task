"use client";

import { useEffect, useState } from "react";
import {
  AsOfBadge,
  Button,
  Card,
  Converter,
  CurrencyAvatar,
  Switch,
  TrendBadge,
} from "@/components/ds";

// Temporary in-brand preview to verify the design system is wired.
// The real app shell is built as its own capability slice later.
export default function Home() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "";
  }, [dark]);

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-6)",
        padding: "var(--space-8) var(--space-5)",
      }}
    >
      <header
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="" width={36} height={36} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-lg)", fontWeight: 600 }}>
              Гривня
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Офіційний курс НБУ
            </div>
          </div>
        </div>
        <Switch checked={dark} onChange={setDark} label="Темна тема" />
      </header>

      <Card style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <CurrencyAvatar code="USD" flag="🇺🇸" />
          <span style={{ fontFamily: "var(--font-sans)", color: "var(--text-secondary)" }}>
            Долар США
          </span>
          <span style={{ marginLeft: "auto" }}>
            <TrendBadge delta={-0.42} />
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              fontSize: "var(--text-4xl)",
              fontWeight: 600,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            41,85
          </span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-2xl)", color: "var(--accent)" }}>
            ₴
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", color: "var(--text-secondary)", margin: "var(--space-2) 0 var(--space-4)" }}>
          Долар за тиждень майже без змін до гривні.
        </p>

        <AsOfBadge date="27.06.2026" stale />

        <div style={{ marginTop: "var(--space-5)" }}>
          <Converter code="USD" rate={41.85} defaultAmount="100" />
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
          <Button iconLeft="trending-up">Динаміка за місяць</Button>
          <Button variant="outline" iconLeft="search">
            Інша валюта
          </Button>
        </div>
      </Card>

      <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Офіційний курс не поспішає. І ви не поспішайте.
      </p>
    </main>
  );
}
