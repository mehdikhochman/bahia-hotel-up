import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import RoomForm from "../RoomForm";
import { createRoomAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/admin/rooms"
        className="text-teal-500 text-sm flex items-center gap-1.5 mb-4 hover:text-teal-700"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>
      <h1 className="font-display text-2xl md:text-3xl text-teal-700 mb-1">
        Nouvel hébergement
      </h1>
      <p className="text-teal-500 text-sm mb-6">
        Tous les champs sont obligatoires.
      </p>
      <div className="bg-white rounded-2xl border border-teal-100 p-5 md:p-7">
        <RoomForm action={createRoomAction} submitLabel="Créer l'hébergement" />
      </div>
    </div>
  );
}
