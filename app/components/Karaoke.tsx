"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Music,
  Sparkles,
  Calendar,
  Clock,
  Wine,
  Users,
  Phone,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createKaraokeReservation } from "@/app/actions/karaoke";

function nextSaturdayISO() {
  const d = new Date();
  const day = d.getDay();
  const delta = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().split("T")[0];
}

const STAR_COUNT = 30;

export default function Karaoke() {
  const [pending, startTransition] = useTransition();
  const [stars, setStars] = useState<
    Array<{ left: string; top: string; size: number; delay: number; dur: number }>
  >([]);
  const [date, setDate] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  useEffect(() => {
    setDate(nextSaturdayISO());
    setStars(
      Array.from({ length: STAR_COUNT }, () => ({
        left: Math.random() * 100 + "%",
        top: Math.random() * 100 + "%",
        size: Math.random() * 3 + 1,
        delay: Math.random() * 2,
        dur: Math.random() * 3 + 2,
      }))
    );
  }, []);

  async function onSubmit(formData: FormData) {
    setSuccess(null);
    setErrors({});
    setTopError(null);
    startTransition(async () => {
      const result = await createKaraokeReservation({
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
        email: formData.get("email") || "",
        date: formData.get("date"),
        partySize: formData.get("partySize"),
        notes: formData.get("notes") || undefined,
      });
      if (result.ok) {
        setSuccess(result.data.reference);
      } else {
        setTopError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  return (
    <section
      id="karaoke"
      className="relative py-24 md:py-28 lg:py-36 overflow-hidden bg-neon-night"
    >
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            width: s.size + "px",
            height: s.size + "px",
            left: s.left,
            top: s.top,
          }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-pink-200 text-xs tracking-widest uppercase mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Tous les samedis soirs
            </div>

            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] mb-6">
              Saturday Night
              <span className="block neon-text text-pink-300 mt-2">Karaoké</span>
            </h2>

            <p className="text-pink-50/85 text-base sm:text-lg leading-relaxed max-w-lg mb-8">
              La nuit la plus festive d'Assinie. Cocktails signature, rythmes
              ivoiriens, classiques internationaux — chante, danse, vibre
              jusqu'au lever du soleil.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {[
                { icon: Calendar, label: "Chaque samedi" },
                { icon: Clock, label: "20h → 03h" },
                { icon: Wine, label: "Open bar VIP" },
                { icon: Mic, label: "+ 5000 titres" },
                { icon: Music, label: "DJ Live" },
                { icon: Sparkles, label: "Front de mer" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="glass rounded-2xl px-3 py-2.5 flex items-center gap-2 text-white/90 text-xs sm:text-sm"
                >
                  <Icon className="w-4 h-4 text-pink-300 shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {success ? (
              <div className="glass rounded-3xl p-8 text-center text-white shadow-glow">
                <CheckCircle2 className="w-14 h-14 mx-auto text-pink-300 mb-4" />
                <h3 className="font-display text-3xl mb-2">À samedi !</h3>
                <p className="text-pink-100/85 mb-4">
                  Table réservée. Référence&nbsp;:
                </p>
                <div className="inline-block px-5 py-2.5 rounded-full bg-white/15 font-mono text-lg tracking-widest">
                  {success}
                </div>
                <p className="text-pink-100/65 text-xs mt-6">
                  Vous recevrez un appel de confirmation sous 24h.
                </p>
              </div>
            ) : (
              <form
                action={onSubmit}
                className="glass rounded-3xl p-6 sm:p-7 shadow-glow"
              >
                <div className="text-center mb-6">
                  <div className="text-pink-300 text-xs uppercase tracking-widest mb-1">
                    Réserver une table
                  </div>
                  <div className="text-white font-display text-2xl">
                    Saturday Night Karaoké
                  </div>
                </div>

                <div className="space-y-3">
                  <NeonField
                    name="fullName"
                    placeholder="Nom complet"
                    icon={Sparkles}
                    error={errors.fullName}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <NeonField
                      name="phone"
                      placeholder="+225 07 ..."
                      icon={Phone}
                      type="tel"
                      error={errors.phone}
                    />
                    <NeonField
                      name="partySize"
                      placeholder="Personnes"
                      type="number"
                      defaultValue="2"
                      min={1}
                      max={20}
                      icon={Users}
                      error={errors.partySize}
                    />
                  </div>
                  <NeonField
                    name="email"
                    type="email"
                    placeholder="Email (optionnel)"
                    icon={Mic}
                    error={errors.email}
                  />
                  <NeonField
                    name="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    icon={Calendar}
                    error={errors.date}
                  />
                  <textarea
                    name="notes"
                    placeholder="Demande spéciale (optionnel)"
                    rows={2}
                    className="w-full bg-white/10 placeholder-white/50 text-white rounded-xl px-4 py-3 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-pink-400/60"
                  />
                </div>

                {topError && (
                  <div className="mt-3 text-pink-200 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {topError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full mt-5 px-7 py-3.5 rounded-full bg-pink-500 hover:bg-pink-400 text-white font-medium transition-all animate-pulse-glow disabled:opacity-60"
                >
                  {pending ? "Réservation..." : "Réserver ma table"}
                </button>

                <p className="text-pink-100/60 text-[11px] text-center mt-3">
                  Tables limitées · Confirmation par téléphone
                </p>
              </form>
            )}
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-pink-500/40 blur-2xl -z-0" />
            <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-purple-500/40 blur-2xl -z-0" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: typeof Mic;
  error?: string;
};

function NeonField({ icon: Icon, error, ...rest }: FieldProps) {
  return (
    <div>
      <div className="relative">
        <Icon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-300/80" />
        <input
          {...rest}
          className={`w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 placeholder-white/50 text-white text-sm border focus:outline-none focus:ring-2 focus:ring-pink-400/60 ${
            error ? "border-pink-400" : "border-white/15"
          }`}
        />
      </div>
      {error && (
        <div className="mt-1 text-pink-200 text-[11px] flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  );
}
