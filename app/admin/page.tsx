import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Mic,
  ArrowRight,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXOF } from "@/lib/utils";
import { formatDateTime, statusLabel, statusTone } from "@/lib/format";

export default async function AdminHome() {
  await requireAdmin();

  const [
    pendingCount,
    awaitingCount,
    confirmedCount,
    cancelledCount,
    upcomingKaraoke,
    recentBookings,
    revenue,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.booking.count({ where: { status: "AWAITING_VERIFICATION" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.karaokeReservation.count({
      where: { date: { gte: new Date() }, status: { not: "CANCELLED" } },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { room: true, user: true },
    }),
    prisma.booking.aggregate({
      _sum: { totalXof: true },
      where: { status: "CONFIRMED" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl text-teal-700 mb-1">
        Vue d'ensemble
      </h1>
      <p className="text-teal-600/70 text-sm mb-6">
        Tableau de bord opérationnel — Bahia Assinie
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-7">
        <Kpi
          icon={Clock}
          label="En attente de paiement"
          value={pendingCount}
          tone="sand"
        />
        <Kpi
          icon={CalendarCheck}
          label="À vérifier (Wave)"
          value={awaitingCount}
          tone="blue"
          highlight={awaitingCount > 0}
        />
        <Kpi
          icon={CheckCircle2}
          label="Confirmées"
          value={confirmedCount}
          tone="green"
        />
        <Kpi icon={XCircle} label="Annulées" value={cancelledCount} tone="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-teal-100 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-teal-700">
              Dernières réservations
            </h2>
            <Link
              href="/admin/bookings"
              className="text-sand-600 text-sm flex items-center gap-1 hover:text-sand-700"
            >
              Tout voir <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <Empty text="Aucune réservation pour le moment." />
          ) : (
            <ul className="divide-y divide-teal-100">
              {recentBookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-ivory-100 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-teal-500">
                        {b.reference}
                      </div>
                      <div className="text-teal-700 text-sm truncate">
                        {b.user.fullName} — {b.room.name}
                      </div>
                      <div className="text-teal-500 text-xs">
                        {formatDateTime(b.createdAt)} · {formatXOF(b.totalXof)}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] ${
                        statusTone[b.status]
                      }`}
                    >
                      {statusLabel[b.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-teal-gradient text-ivory-100 rounded-2xl p-5">
            <div className="text-ivory-100/70 text-xs uppercase tracking-widest mb-1">
              Revenu confirmé
            </div>
            <div className="font-display text-3xl">
              {formatXOF(revenue._sum.totalXof ?? 0)}
            </div>
            <div className="text-ivory-100/60 text-xs mt-1">
              Cumul des séjours validés
            </div>
          </div>

          <Link
            href="/admin/karaoke"
            className="block bg-white rounded-2xl border border-teal-100 p-5 hover:border-sand-500 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-pink-500 text-xs uppercase tracking-widest mb-1">
                  <Mic className="w-3.5 h-3.5" />
                  Karaoké à venir
                </div>
                <div className="font-display text-3xl text-teal-700">
                  {upcomingKaraoke}
                </div>
                <div className="text-teal-500 text-xs">
                  Réservations actives
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-teal-400" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "sand" | "blue" | "green" | "red";
  highlight?: boolean;
}) {
  const toneCls = {
    sand: "text-sand-700 bg-sand-100/60",
    blue: "text-blue-700 bg-blue-50",
    green: "text-emerald-700 bg-emerald-50",
    red: "text-red-700 bg-red-50",
  }[tone];
  return (
    <div
      className={`relative bg-white rounded-2xl border border-teal-100 p-4 ${
        highlight ? "ring-2 ring-sand-500/60" : ""
      }`}
    >
      <div className={`inline-flex w-9 h-9 rounded-xl ${toneCls} items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-teal-500 text-xs">{label}</div>
      <div className="font-display text-3xl text-teal-700 mt-0.5">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-10 text-center text-teal-500/70 text-sm">{text}</div>
  );
}
