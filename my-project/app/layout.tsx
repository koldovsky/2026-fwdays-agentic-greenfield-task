import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ForgeFlow — облік виробництва", description: "Облік закупівель, матеріалів і виробництва" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="uk"><body>{children}</body></html>; }
