"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Smartphone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import QrPlaceholder from "./QrPlaceholder";
import { submitWaveReference } from "@/app/actions/booking";
import { formatXOF } from "@/lib/utils";

type Props = {
  reference: string;
  amount: number;
  breakdown?: {
    subtotal: number;
    vat: number;
    cityTax: number;
    nights: number;
  };
  alreadySubmitted: boolean;
  waveNumber: string;
  merchantName: string;
  /** Static image URL — takes precedence if provided. */
  qrUrl?: string | null;
  /** Wave merchant payment link (e.g. https://pay.wave.com/m/…). */
  waveLink?: string | null;
};

export default function WaveCheckout({
  reference,
  amount,
  breakdown,
  alreadySubmitted,
  waveNumber,
  merchantName,
  qrUrl,
  waveLink,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [waveRef, setWaveRef] = useState("");
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyRef() {
    navigator.clipboard.writeText(reference).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitWaveReference({
        bookingReference: reference,
        waveReference: waveRef.trim(),
      });
      if (result.ok) {
        setSubmitted(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 md:p-10 shadow-soft border border-teal-100 text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-sand-500/20 grid place-items-center mb-5">
          <CheckCircle2 className="w-9 h-9 text-sand-600" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl text-teal-700 mb-2">
          Paiement reçu, en vérification.
        </h2>
        <p className="text-teal-600/85 max-w-md mx-auto leading-relaxed">
          Notre équipe rapproche votre paiement Wave sous 30 minutes. Vous
          recevrez la confirmation finale par email avec les détails de votre
          arrivée à Assinie.
        </p>
        <div className="mt-6 inline-block px-5 py-2.5 rounded-full bg-ivory-200 text-teal-700 font-mono text-sm">
          {reference}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
      {/* Wave card + QR */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="rounded-3xl bg-gradient-to-br from-[#1A1AE0] via-[#3939FF] to-[#5C5CFF] p-6 md:p-7 text-white relative overflow-hidden shadow-soft">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest opacity-80">
                Paiement mobile
              </span>
            </div>
            <div className="font-display text-3xl md:text-4xl mb-1">Wave Money</div>
            <div className="text-white/80 text-sm">
              Rapide, sans frais, instantané.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-7 border border-teal-100 text-center shadow-soft">
          <div className="text-teal-500 text-xs uppercase tracking-widest mb-3">
            Scannez pour payer via Wave
          </div>

          <div className="aspect-square w-full max-w-[260px] mx-auto rounded-2xl bg-ivory-100 grid place-items-center border border-teal-100 overflow-hidden">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="QR Wave Bahia"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <QrPlaceholder
                value={waveLink ?? undefined}
                seed={reference}
                className="bg-white"
              />
            )}
          </div>

          {waveLink && (
            <a
              href={waveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sand-700 hover:text-sand-800 text-xs underline"
            >
              Ouvrir le lien Wave →
            </a>
          )}

          <div className="mt-5 space-y-1">
            <div className="text-teal-500 text-xs uppercase tracking-widest">
              Numéro Wave
            </div>
            <div className="font-mono font-semibold text-teal-700 text-lg">
              {waveNumber}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-teal-500 text-xs uppercase tracking-widest mb-1">
              Montant exact
            </div>
            <div className="font-display text-3xl md:text-4xl text-teal-700">
              {formatXOF(amount)}
            </div>
          </div>

          <div className="mt-3 text-teal-500/80 text-xs">
            Bénéficiaire : <strong>{merchantName}</strong>
          </div>
        </div>

        {breakdown && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-teal-100 shadow-soft">
            <div className="text-teal-500 text-xs uppercase tracking-widest mb-3">
              Détail du séjour
            </div>
            <div className="space-y-1.5 text-sm">
              <Row
                label={`Sous-total (${breakdown.nights} nuit${breakdown.nights > 1 ? "s" : ""})`}
                value={formatXOF(breakdown.subtotal)}
              />
              <Row label="TVA 18 %" value={formatXOF(breakdown.vat)} muted />
              <Row
                label="Taxe de séjour"
                value={formatXOF(breakdown.cityTax)}
                muted
              />
              <div className="pt-2 mt-2 border-t border-teal-100 flex justify-between items-baseline">
                <span className="text-teal-700 font-medium">Total</span>
                <span className="font-display text-teal-700 text-xl">
                  {formatXOF(amount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Instructions + form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-5"
      >
        <div className="rounded-3xl bg-white border border-teal-100 p-6 md:p-7 shadow-soft">
          <div className="font-display text-teal-700 text-xl mb-1">
            Référence de réservation
          </div>
          <div className="text-teal-500 text-xs mb-4">
            Mentionnez-la si Wave vous le demande.
          </div>
          <div className="flex items-center gap-2 bg-ivory-200 rounded-xl px-4 py-3">
            <span className="font-mono text-teal-700 text-base sm:text-lg tracking-wider flex-1 truncate">
              {reference}
            </span>
            <button
              onClick={copyRef}
              className="shrink-0 px-3 py-1.5 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 text-xs font-medium flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" /> Copié
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copier
                </>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-ivory-200/40 border border-ivory-200 p-6 md:p-7">
          <div className="font-display text-teal-700 text-xl mb-4">
            Comment payer
          </div>
          <ol className="space-y-3 text-teal-700 text-sm">
            <Step n={1}>
              Ouvrez l'application <strong>Wave</strong> sur votre téléphone.
            </Step>
            <Step n={2}>
              Scannez le QR ou envoyez au numéro <strong>{waveNumber}</strong>.
            </Step>
            <Step n={3}>
              Montant exact : <strong>{formatXOF(amount)}</strong>.
            </Step>
            <Step n={4}>
              Recopiez ci-dessous l'<strong>identifiant Wave</strong> reçu par
              SMS.
            </Step>
          </ol>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl bg-white border border-teal-100 p-6 md:p-7 shadow-soft"
        >
          <label className="block">
            <div className="text-teal-700 text-sm font-medium mb-1.5">
              Identifiant de transaction Wave
            </div>
            <input
              required
              value={waveRef}
              onChange={(e) => setWaveRef(e.target.value)}
              placeholder="TX-XXXXXXXXXX"
              className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-ivory-100 text-teal-700 focus:outline-none focus:ring-2 focus:ring-sand-500 focus:border-sand-500 transition-colors text-sm"
            />
            <div className="text-teal-500/80 text-xs mt-1">
              Reçu par SMS après le paiement Wave.
            </div>
          </label>

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full mt-4 px-6 py-3.5 rounded-full bg-sand-500 hover:bg-sand-400 text-teal-800 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Envoi...
              </>
            ) : (
              <>Valider mon paiement Wave</>
            )}
          </button>

          <div className="mt-3 flex items-center gap-1.5 text-teal-500 text-[11px]">
            <Lock className="w-3 h-3" />
            Vérification manuelle sous 30 min · Notification email
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-teal-500 text-ivory-100 grid place-items-center text-xs shrink-0 mt-0.5 font-semibold">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-teal-500" : "text-teal-700"}>{label}</span>
      <span className={muted ? "text-teal-600" : "text-teal-700 font-medium"}>
        {value}
      </span>
    </div>
  );
}
