import Link from "next/link";
import {
  BedDouble,
  Users,
  Maximize,
  Eye,
  EyeOff,
  Plus,
  Pencil,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXOF } from "@/lib/utils";
import { toggleRoomActiveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  await requireAdmin();

  const rooms = await prisma.room.findMany({
    orderBy: [{ isActive: "desc" }, { type: "asc" }, { pricePerNight: "desc" }],
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-teal-700">
            Hébergements
          </h1>
          <p className="text-teal-500 text-sm">
            {rooms.length} hébergement(s) — {rooms.filter((r) => r.isActive).length} actif(s)
          </p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-sand-500 hover:bg-sand-400 text-teal-800 font-semibold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouvel hébergement
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-teal-100 py-14 text-center text-teal-500/80 text-sm">
          Aucun hébergement. Commencez par en créer un.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border overflow-hidden ${
                r.isActive ? "border-teal-100" : "border-red-200 opacity-75"
              }`}
            >
              <div
                className="relative h-32 bg-cover bg-center"
                style={{ backgroundImage: `url('${r.imageUrl}')` }}
              >
                <span
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1 ${
                    r.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.isActive ? (
                    <>
                      <Eye className="w-3 h-3" /> Actif
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" /> Masqué
                    </>
                  )}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-sand-600 text-[11px] uppercase tracking-widest mb-1">
                  <BedDouble className="w-3 h-3" />
                  {r.type === "VILLA" ? "Villa" : "Chambre"}
                </div>
                <div className="font-display text-teal-700 text-lg">{r.name}</div>
                <div className="text-teal-500 text-xs mb-3 line-clamp-2">
                  {r.tagline}
                </div>
                <div className="flex items-center gap-3 text-teal-500 text-xs mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {r.capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <Maximize className="w-3 h-3" /> {r.surfaceSqm}m²
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-teal-700 text-lg">
                    {formatXOF(r.pricePerNight)}
                  </span>
                  <span className="text-teal-500 text-xs">/ nuit</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-teal-100">
                  <Link
                    href={`/admin/rooms/${r.id}`}
                    className="flex-1 px-3 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-3 h-3" /> Modifier
                  </Link>
                  <form action={toggleRoomActiveAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-full border border-teal-200 text-teal-600 hover:bg-ivory-200 text-xs"
                    >
                      {r.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
