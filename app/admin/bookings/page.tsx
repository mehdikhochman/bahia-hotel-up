import Link from "next/link";
import { Search, AlertCircle } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXOF } from "@/lib/utils";
import { formatDate, formatDateTime, statusLabel, statusTone } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS: Array<{
  id: "ALL" | BookingStatus;
  label: string;
}> = [
  { id: "ALL", label: "Toutes" },
  { id: "AWAITING_VERIFICATION", label: "À vérifier" },
  { id: "PENDING_PAYMENT", label: "En attente" },
  { id: "CONFIRMED", label: "Confirmées" },
  { id: "CANCELLED", label: "Annulées" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  await requireAdmin();

  const status = (searchParams.status as BookingStatus | "ALL") ?? "ALL";
  const q = searchParams.q?.trim() || "";

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status !== "ALL" && status ? { status: status as BookingStatus } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              { user: { fullName: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { phone: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { user: true, room: true, payment: true },
    take: 100,
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 md:mb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-teal-700">
            Réservations
          </h1>
          <p className="text-teal-500 text-xs md:text-sm">
            100 dernières · filtrer ci-dessous
          </p>
        </div>

        <form className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
          {status !== "ALL" && (
            <input type="hidden" name="status" value={status} />
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder="Référence, nom, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-teal-100 bg-white text-teal-700 text-sm focus:outline-none focus:ring-2 focus:ring-sand-500"
          />
        </form>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 md:mb-5 -mx-1 px-1 pb-1">
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.id !== "ALL") params.set("status", f.id);
          if (q) params.set("q", q);
          const href = `/admin/bookings${
            params.toString() ? `?${params.toString()}` : ""
          }`;
          const active = (status || "ALL") === f.id;
          return (
            <Link
              key={f.id}
              href={href}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border min-h-[36px] flex items-center ${
                active
                  ? "bg-teal-500 text-ivory-100 border-teal-500"
                  : "border-teal-200 text-teal-600 hover:border-teal-400"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-teal-100 py-14 text-center text-teal-500/80 text-sm">
          Aucune réservation ne correspond.
        </div>
      ) : (
        <>
          {/* Mobile cards (<md) */}
          <ul className="md:hidden space-y-3">
            {bookings.map((b) => {
              const urgent = b.status === "AWAITING_VERIFICATION";
              return (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="block bg-white rounded-2xl border border-teal-100 p-4 active:bg-ivory-100"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {urgent && (
                          <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span className="font-mono text-xs text-teal-700 truncate">
                          {b.reference}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] ${
                          statusTone[b.status]
                        }`}
                      >
                        {statusLabel[b.status]}
                      </span>
                    </div>
                    <div className="text-teal-700 text-sm font-medium truncate">
                      {b.user.fullName}
                    </div>
                    <div className="text-teal-500 text-xs truncate">
                      {b.room.name} · {b.nights}n · {b.guests} pers.
                    </div>
                    <div className="text-teal-500 text-xs mt-1">
                      {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-teal-400 text-[11px]">
                        {formatDateTime(b.createdAt)}
                      </span>
                      <span className="font-display text-teal-700 text-base whitespace-nowrap">
                        {formatXOF(b.totalXof)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop table (md+) */}
          <div className="hidden md:block bg-white rounded-2xl border border-teal-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ivory-200/50 text-teal-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left py-3 px-4">Référence</th>
                  <th className="text-left py-3 px-4">Voyageur</th>
                  <th className="text-left py-3 px-4">Hébergement</th>
                  <th className="text-left py-3 px-4">Séjour</th>
                  <th className="text-right py-3 px-4">Total</th>
                  <th className="text-right py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100">
                {bookings.map((b) => {
                  const urgent = b.status === "AWAITING_VERIFICATION";
                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-ivory-100/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="font-mono text-xs text-teal-700 hover:text-sand-700 flex items-center gap-1.5"
                        >
                          {urgent && (
                            <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          {b.reference}
                        </Link>
                        <div className="text-teal-500 text-[11px] mt-0.5">
                          {formatDateTime(b.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-teal-700">{b.user.fullName}</div>
                        <div className="text-teal-500 text-xs">
                          {b.user.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-teal-700">{b.room.name}</td>
                      <td className="py-3 px-4 text-teal-600 text-xs">
                        {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                        <div className="text-teal-500">
                          {b.nights}n · {b.guests} pers.
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-teal-700 whitespace-nowrap">
                        {formatXOF(b.totalXof)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full border text-[11px] ${
                            statusTone[b.status]
                          }`}
                        >
                          {statusLabel[b.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
