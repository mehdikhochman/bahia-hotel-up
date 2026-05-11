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
  { href: "/admin", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Résa", icon: CalendarCheck },
  { href: "/admin/karaoke", label: "Karaoké", icon: Mic },
  { href: "/admin/rooms", label: "Chambres", icon: BedDouble },
  { href: "/admin/settings", label: "Réglages", icon: Settings },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) return <>{children}</>;

  return (
    <div className="min-h-[100svh] bg-ivory-200/40 pb-20 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-teal-700 text-ivory-100 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 grid place-items-center rounded-full bg-ivory-100 text-teal-700 shrink-0">
              <Waves className="w-4 h-4" />
            </span>
            <span className="font-display text-lg md:text-xl truncate">
              Bahia · Staff
            </span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden md:block leading-tight">
              <div className="text-xs text-ivory-100/70">Connecté</div>
              <div className="text-sm font-medium truncate max-w-[140px]">
                {session.fullName}
              </div>
            </div>
            <a
              href="/admin/logout"
              className="px-3 py-2 rounded-full bg-ivory-100/10 hover:bg-ivory-100/20 text-xs flex items-center gap-1.5 min-h-[36px]"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sortir</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 md:grid md:grid-cols-[220px,1fr] md:gap-6">
        {/* Desktop sidebar */}
        <nav className="hidden md:block md:sticky md:top-20 md:self-start">
          <ul className="flex flex-col gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-teal-700 hover:bg-ivory-100 text-sm"
                >
                  <n.icon className="w-4 h-4" />
                  {n.label === "Résa" ? "Réservations" : n.label === "Réglages" ? "Paramètres" : n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-teal-100 shadow-[0_-8px_24px_-12px_rgba(0,68,92,0.15)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-teal-600 active:bg-ivory-200 transition-colors"
              >
                <n.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{n.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
