"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wind,
  Wifi,
  Eye,
  Users,
  Maximize,
  ChefHat,
  Bath,
  Waves,
  Sparkles,
  ConciergeBell,
} from "lucide-react";
import type { SerializedRoom } from "@/types";
import { formatXOF } from "@/lib/utils";

const amenityIcon: Record<string, typeof Wind> = {
  AC: Wind,
  "Wi-Fi": Wifi,
  "Vue océan": Waves,
  "Vue lagune": Eye,
  "Vue jardin": Eye,
  "Plage privée": Waves,
  "Piscine privée": Waves,
  Jacuzzi: Sparkles,
  "Cuisine équipée": ChefHat,
  Terrasse: Eye,
  Balcon: Eye,
  "Mini-bar": Sparkles,
  "Lit king-size": Sparkles,
  "Salle de bain marbre": Bath,
  "Service majordome": ConciergeBell,
};

type Filter = "ALL" | "VILLA" | "ROOM";

type Props = {
  rooms: SerializedRoom[];
  onBook: (room: SerializedRoom) => void;
};

export default function Accommodations({ rooms, onBook }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const filtered = useMemo(
    () => (filter === "ALL" ? rooms : rooms.filter((r) => r.type === filter)),
    [rooms, filter]
  );

  return (
    <section id="hebergements" className="relative py-20 md:py-28 lg:py-32 bg-ivory-100">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
          <div>
            <p className="text-sand-600 text-xs sm:text-sm tracking-widest uppercase mb-3">
              Hébergements
            </p>
            <h2 className="font-display text-teal-700 text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-2xl leading-tight">
              Villas et chambres taillées pour la quiétude.
            </h2>
          </div>
          <div
            role="tablist"
            aria-label="Filtrer les hébergements"
            className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1"
          >
            {[
              { id: "ALL" as Filter, label: "Tous" },
              { id: "VILLA" as Filter, label: "Villas" },
              { id: "ROOM" as Filter, label: "Chambres" },
            ].map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm border transition-all ${
                  filter === f.id
                    ? "bg-teal-500 text-ivory-100 border-teal-500"
                    : "border-teal-200 text-teal-600 hover:border-teal-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-7">
          {filtered.map((r, i) => (
            <motion.article
              key={r.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              className="group bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-[0_25px_60px_-15px_rgba(0,68,92,0.35)] transition-all duration-500"
            >
              <div className="relative h-60 sm:h-72 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('${r.imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/70 via-transparent to-transparent" />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-ivory-100/90 text-teal-700 text-xs font-medium tracking-wider uppercase">
                  {r.type === "VILLA" ? "Villa" : "Chambre"}
                </span>
                {r.totalUnits > 1 && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-sand-500/95 text-teal-800 text-[11px] font-semibold">
                    {r.totalUnits} unités
                  </span>
                )}
                <div className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-sand-500/95 backdrop-blur-sm text-teal-800 text-sm font-semibold">
                  {formatXOF(r.pricePerNight)}{" "}
                  <span className="opacity-80 text-xs font-normal">/ nuit</span>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <h3 className="font-display text-xl sm:text-2xl text-teal-700 mb-1">
                  {r.name}
                </h3>
                <p className="text-sand-600 text-sm italic mb-3">{r.tagline}</p>
                <p className="text-teal-700/80 text-sm leading-relaxed mb-5">
                  {r.description}
                </p>

                <div className="flex items-center gap-5 text-teal-500 text-xs mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {r.capacity} pers.
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Maximize className="w-4 h-4" /> {r.surfaceSqm} m²
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {r.amenities.map((am) => {
                    const Icon = amenityIcon[am] || Sparkles;
                    return (
                      <span
                        key={am}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ivory-200 text-teal-600 text-xs"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {am}
                      </span>
                    );
                  })}
                </div>

                <button
                  onClick={() => onBook(r)}
                  className="w-full py-3.5 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 font-medium transition-colors"
                >
                  Réserver
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
