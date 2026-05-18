"use client";

import { ArrowRight, Users, BedDouble, Wifi, Wind } from "lucide-react";

export type RoomCardData = {
  id: string;
  name: string;
  type: "VILLA" | "ROOM";
  imageUrl: string;
  pricePerNightFormatted: string;
  totalForStayFormatted?: string;
  capacity: number;
  amenities?: string[];
  available?: boolean;
  unitsRemaining?: number;
  totalUnits?: number;
  deepLink?: string; // /?openBooking=1&...
};

export default function RoomCard({ room }: { room: RoomCardData }) {
  return (
    <a
      href={room.deepLink ?? `/#hebergements`}
      className="block group rounded-2xl bg-white border border-teal-100 overflow-hidden shadow-sm hover:shadow-soft transition-all"
    >
      <div className="flex gap-3">
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${room.imageUrl}')` }}
        />
        <div className="flex-1 min-w-0 py-2 pr-3">
          <div className="flex items-center gap-1.5 text-sand-700 text-[10px] uppercase tracking-widest">
            <BedDouble className="w-3 h-3" />
            {room.type === "VILLA" ? "Villa" : "Chambre"}
          </div>
          <div className="font-display text-teal-700 text-base leading-tight truncate">
            {room.name}
          </div>
          <div className="text-teal-500 text-[11px] flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-0.5">
              <Users className="w-3 h-3" /> {room.capacity}
            </span>
            {room.available === false ? (
              <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px]">
                Complet
              </span>
            ) : room.unitsRemaining !== undefined &&
              room.totalUnits !== undefined &&
              room.totalUnits > 1 ? (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px]">
                {room.unitsRemaining}/{room.totalUnits} dispo
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div>
              <div className="text-teal-500 text-[10px]">
                à partir de
              </div>
              <div className="font-display text-teal-700 text-sm">
                {room.pricePerNightFormatted}
                <span className="text-[10px] text-teal-500 font-normal">
                  {" "}
                  / nuit
                </span>
              </div>
            </div>
            <span className="text-sand-600 text-xs flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Réserver <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
      {room.totalForStayFormatted && (
        <div className="px-3 py-2 bg-sand-100/60 text-[11px] text-teal-700 border-t border-teal-100">
          Total pour ce séjour : <strong>{room.totalForStayFormatted}</strong>{" "}
          (TVA + taxe incluses)
        </div>
      )}
    </a>
  );
}
