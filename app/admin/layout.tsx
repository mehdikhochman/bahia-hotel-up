import Link from "next/link";
import {
  LayoutDashboard,
  CalendarCheck,
  Mic,
  BedDouble,
  LogOut,
  Waves,
  Settings,
} from "lucide-react";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Réservations", icon: CalendarCheck },
  { href: "/admin/karaoke", label: "Karaoké", icon: Mic },
  { href: "/admin/rooms", label: "Hébergements", icon: BedDouble },
  { href: "/admin/settings", label: "Paramètres Wave", icon: Settings },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  // The login page sits under /admin too — render bare if no session.
  if (!session) return <>{children}</>;

  return (
    <div className="min-h-[100svh] bg-ivory-200/40">
      <header className="sticky top-0 z-30 bg-teal-700 text-ivory-100 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="w-8 h-8 grid place-items-center rounded-full bg-ivory-100 text-teal-700">
              <Waves className="w-4 h-4" />
            </span>
            <span className="font-display text-xl">Bahia · Staff</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-xs text-ivory-100/70">Connecté</div>
              <div className="text-sm font-medium">{session.fullName}</div>
            </div>
            <a
              href="/admin/logout"
              className="px-3 py-1.5 rounded-full bg-ivory-100/10 hover:bg-ivory-100/20 text-xs flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sortir
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid md:grid-cols-[220px,1fr] gap-6">
        <nav className="md:sticky md:top-20 md:self-start">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {NAV.map((n) => (
              <li key={n.href} className="shrink-0 md:shrink">
                <Link
                  href={n.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-teal-700 hover:bg-ivory-100 text-sm whitespace-nowrap"
                >
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
