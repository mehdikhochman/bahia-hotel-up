import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import RoomForm from "../RoomForm";
import { updateRoomAction, deleteRoomAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditRoomPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const room = await prisma.room.findUnique({ where: { id: params.id } });
  if (!room) notFound();

  const bookingCount = await prisma.booking.count({
    where: { roomId: room.id },
  });

  // Bind the room id into the action so the form can use the standard signature
  const boundUpdate = updateRoomAction.bind(null, room.id);

  return (
    <div>
      <Link
        href="/admin/rooms"
        className="text-teal-500 text-sm flex items-center gap-1.5 mb-4 hover:text-teal-700"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-teal-700 mb-1">
            Modifier · {room.name}
          </h1>
          <p className="text-teal-500 text-sm">
            {bookingCount} réservation(s) liée(s) à cet hébergement.
          </p>
        </div>
        <form action={deleteRoomAction}>
          <input type="hidden" name="id" value={room.id} />
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs flex items-center gap-1.5"
            title={
              bookingCount > 0
                ? "Désactive l'hébergement (réservations liées)"
                : "Supprime définitivement l'hébergement"
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
            {bookingCount > 0 ? "Désactiver" : "Supprimer"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-teal-100 p-5 md:p-7">
        <RoomForm
          initial={room}
          action={boundUpdate}
          submitLabel="Mettre à jour"
        />
      </div>
    </div>
  );
}
