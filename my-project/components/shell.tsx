import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { requireSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions";

export async function Shell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const user = await requireSession();
  return <div className="app-frame"><aside><Link href="/dashboard" className="logo"><span>FF</span><strong>ForgeFlow</strong></Link><Navigation/><div className="user-card"><span className="avatar">{user.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{user.fullName}</strong><small>{user.role}</small></div><form action={logoutAction}><button className="text-button">Вийти</button></form></div></aside><main className="workspace"><header><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="live-pill"><span /> Актуальні JSON-дані</div></header>{children}</main></div>;
}
