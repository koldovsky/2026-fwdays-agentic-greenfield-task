import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focus Blocks — day planner",
  description: "Write your day in plain text — see the timeline, overlaps, and focus time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
