import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ForgeFlow Inventory", description: "Procurement and manufacturing inventory control" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

