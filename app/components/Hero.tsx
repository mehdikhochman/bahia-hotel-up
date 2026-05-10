"use client";

import { motion } from "framer-motion";
import { ChevronDown, MapPin, Star } from "lucide-react";

type Props = { onBook: () => void };

export default function Hero({ onBook }: Props) {
  return (
    <section id="accueil" className="relative min-h-[100svh] w-full overflow-hidden">
      <div
        className="absolute inset-0 animate-slow-zoom bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-teal-900/55 via-teal-700/30 to-teal-900/85" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 pt-32 md:pt-40 pb-20 min-h-[100svh] flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 text-ivory-100/90 text-xs sm:text-sm tracking-widest uppercase mb-5"
        >
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Assinie Terminal · Côte d'Ivoire</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-display text-ivory-100 text-[42px] leading-[1.05] sm:text-6xl md:text-7xl lg:text-8xl max-w-4xl"
        >
          Là où la lagune{" "}
          <em className="not-italic gold-shimmer">embrasse</em> l'océan.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25 }}
          className="mt-5 md:mt-6 max-w-xl text-ivory-100/90 text-base md:text-lg leading-relaxed"
        >
          Au bout de la péninsule, là où le silence se mêle au murmure des
          vagues. Une parenthèse exclusive, à 80 km d'Abidjan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center w-full sm:w-auto"
        >
          <button
            onClick={onBook}
            className="w-full sm:w-auto px-7 py-4 rounded-full bg-sand-500 hover:bg-sand-400 text-teal-800 font-semibold text-base shadow-sand transition-all hover:-translate-y-0.5"
          >
            Réserver mon séjour
          </button>
          <a
            href="#hebergements"
            className="w-full sm:w-auto text-center px-7 py-4 rounded-full border border-ivory-100/40 text-ivory-100 hover:bg-ivory-100/10 transition-colors backdrop-blur-sm"
          >
            Découvrir les villas
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-10 md:mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 text-ivory-100/85 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-sand-400 text-sand-400"
              />
            ))}
            <span className="ml-2">4,9/5 · voyageurs</span>
          </div>
          <span className="hidden md:inline opacity-50">|</span>
          <span>200 m de plage privée</span>
          <span className="hidden md:inline opacity-50">|</span>
          <span>80 km d'Abidjan</span>
        </motion.div>
      </div>

      <motion.a
        href="#hebergements"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-ivory-100/80 z-10"
        aria-label="Faire défiler"
      >
        <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7" />
      </motion.a>
    </section>
  );
}
