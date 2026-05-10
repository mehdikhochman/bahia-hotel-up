"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Waves } from "lucide-react";
import { navLinks } from "@/types";

type Props = { onBook: () => void };

export default function Navbar({ onBook }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-ivory-100/90 backdrop-blur-md shadow-soft"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 lg:px-10 h-16 md:h-20 flex items-center justify-between">
        <a href="#accueil" className="flex items-center gap-2" aria-label="Bahia">
          <span
            className={`w-9 h-9 grid place-items-center rounded-full transition-colors ${
              scrolled ? "bg-teal-500 text-ivory-100" : "bg-ivory-100/90 text-teal-600"
            }`}
          >
            <Waves className="w-4 h-4" />
          </span>
          <span
            className={`font-display text-2xl tracking-wider transition-colors ${
              scrolled ? "text-teal-700" : "text-ivory-100 drop-shadow"
            }`}
          >
            Bahia
          </span>
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`text-sm tracking-wide transition-colors ${
                  scrolled
                    ? "text-teal-600 hover:text-sand-600"
                    : "text-ivory-100/90 hover:text-white drop-shadow"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <button
            onClick={onBook}
            className="px-5 py-2.5 rounded-full bg-sand-500 text-teal-800 text-sm font-semibold hover:bg-sand-400 transition-all hover:shadow-sand"
          >
            Réserver
          </button>
        </div>

        <button
          className={`md:hidden p-2 -mr-2 rounded-lg ${
            scrolled ? "text-teal-700" : "text-ivory-100"
          }`}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-ivory-100/95 backdrop-blur-md border-t border-teal-100"
          >
            <ul className="px-5 py-4 flex flex-col gap-2 safe-bottom">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-teal-700"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  onClick={() => {
                    setOpen(false);
                    onBook();
                  }}
                  className="w-full mt-2 px-5 py-3.5 rounded-full bg-sand-500 text-teal-800 font-semibold"
                >
                  Réserver
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
