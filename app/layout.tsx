import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StopButton } from "@/components/emergency-intercept/StopButton";
import { EmergencyModal } from "@/components/emergency-intercept/EmergencyModal";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bye Binge",
  description: "Your emergency stop for binge urges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* id="main-content" is targeted by EmergencyModal to set inert on background */}
        <div id="main-content" className="flex flex-col flex-1">{children}</div>
        {/* Pre-mounted on every route — D1 & D2 from design.md */}
        <StopButton />
        <EmergencyModal />
        <ThemeProvider />
      </body>
    </html>
  );
}
