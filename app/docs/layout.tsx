import { IBM_Plex_Sans } from "next/font/google";
import "./wizard.css";

const wizardSans = IBM_Plex_Sans({
  variable: "--font-wizard-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${wizardSans.variable} flex min-h-full flex-1 flex-col`}>
      {children}
    </div>
  );
}
