"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed, Sailboat, Sunset, Flower2 } from "lucide-react";

const items = [
  {
    icon: UtensilsCrossed,
    title: "Table d'auteur",
    text: "Cuisine ivoirienne revisitée : poissons du jour, attiéké de la lagune, accords inattendus.",
  },
  {
    icon: Sailboat,
    title: "Sortie pirogue",
    text: "Traversée de la lagune au lever du jour, vers les villages éburnéens préservés.",
  },
  {
    icon: Sunset,
    title: "Apéro coucher de soleil",
    text: "Cocktails signature les pieds dans le sable, face à l'océan flamboyant.",
  },
  {
    icon: Flower2,
    title: "Spa tropical",
    text: "Massages au beurre de karité, soins au cacao — l'âme de l'Afrique de l'Ouest.",
  },
];

export default function Experience() {
  return (
    <section id="experience" className="py-20 md:py-28 lg:py-32 bg-ivory-200/40">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="max-w-2xl mb-10 md:mb-14">
          <p className="text-sand-600 text-xs sm:text-sm tracking-widest uppercase mb-3">
            L'expérience Bahia
          </p>
          <h2 className="font-display text-teal-700 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight">
            Une exclusivité qui se vit, plus qu'elle ne se raconte.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-ivory-100 rounded-3xl p-6 md:p-7 border border-ivory-200 hover:border-sand-500 transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-500 text-ivory-100 grid place-items-center mb-5">
                <it.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl text-teal-700 mb-2">
                {it.title}
              </h3>
              <p className="text-teal-600/80 text-sm leading-relaxed">
                {it.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
