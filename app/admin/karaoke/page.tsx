import { Mic, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { updateKaraokeStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "À traiter",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};
const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-sand-100 text-sand-700 border-sand-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default async function AdminKaraokePage() {
  await requireAdmin();

  const reservations = await prisma.karaokeReservation.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  // Group by upcoming Saturday
  const byDate = reservations.reduce<Record<string, typeof reservations>>(
    (acc, r) => {
      const k = r.date.toISOString().split("T")[0];
      (acc[k] = acc[k] || []).push(r);
      return acc;
    },
    {}
  );
  const dates = Object.keys(byDate).sort();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 grid place-items-center rounded-full bg-pink-500 text-white">
          <Mic className="w-5 h-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-teal-700">
            Karaoké du samedi
          </h1>
          <p className="text-teal-500 text-sm">
            {reservations.length} réservation(s)
          </p>
        </div>
      </div>

      {dates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-teal-100 py-14 text-center text-teal-500/80 text-sm">
          Aucune réservation karaoké pour le moment.
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((d) => {
            const list = byDate[d];
            const totalPpl = list.reduce(
              (s, r) => s + (r.status !== "CANCELLED" ? r.partySize : 0),
              0
            );
            return (
              <section
                key={d}
                className="bg-white rounded-2xl border border-teal-100 overflow-hidden"
              >
                <header className="px-4 sm:px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-teal-700 min-w-0">
                    <Calendar className="w-4 h-4 text-sand-600 shrink-0" />
                    <span className="font-display text-base sm:text-lg capitalize truncate">
                      {formatDate(d)}
                    </span>
                  </div>
                  <span className="text-teal-600 text-xs sm:text-sm whitespace-nowrap">
                    {totalPpl} pers.
                  </span>
                </header>
                <ul className="divide-y divide-teal-100">
                  {list.map((r) => (
                    <li
                      key={r.id}
                      className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-teal-700 font-medium">
                          {r.fullName}{" "}
                          <span className="text-teal-500 font-normal">
                            · {r.partySize} pers.
                          </span>
                        </div>
                        <div className="text-teal-500 text-xs">
                          {r.phone}
                          {r.email && ` · ${r.email}`}
                        </div>
                        {r.notes && (
                          <div className="text-teal-600 text-xs italic mt-1">
                            « {r.notes} »
                          </div>
                        )}
                        <div className="text-teal-400 text-[11px] mt-1 font-mono">
                          {r.reference} · {formatDateTime(r.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[11px] ${
                            STATUS_TONE[r.status]
                          }`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                        {r.status === "PENDING" && (
                          <>
                            <form action={updateKaraokeStatusAction}>
                              <input
                                type="hidden"
                                name="reservationId"
                                value={r.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value="CONFIRMED"
                              />
                              <button
                                title="Confirmer"
                                className="w-10 h-10 sm:w-8 sm:h-8 grid place-items-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200 touch-manipulation"
                              >
                                <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4" />
                              </button>
                            </form>
                            <form action={updateKaraokeStatusAction}>
                              <input
                                type="hidden"
                                name="reservationId"
                                value={r.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value="CANCELLED"
                              />
                              <button
                                title="Annuler"
                                className="w-10 h-10 sm:w-8 sm:h-8 grid place-items-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 touch-manipulation"
                              >
                                <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
