"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ShieldCheck,
  Upload,
  FileCheck2,
  Loader2,
  AlertCircle,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  Calendar,
  Users,
} from "lucide-react";
import { confirmChatBooking, submitWaveReference } from "@/app/actions/booking";
import { formatXOF } from "@/lib/utils";
import QrPlaceholder from "../QrPlaceholder";

/** Shape produced by the `prepareBooking` AI tool. */
export type BookingDraft = {
  roomId: string;
  roomName: string;
  roomType: "VILLA" | "ROOM";
  imageUrl: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  pricePerNightFormatted: string;
  subtotalFormatted: string;
  vatFormatted: string;
  cityTaxFormatted: string;
  total: number;
  totalFormatted: string;
};

type IdType = "CNI" | "PASSPORT" | "CONSULAR_CARD" | "RESIDENCE_PERMIT";

const ID_TYPES: Array<{ value: IdType; label: string; requiresBack: boolean }> = [
  { value: "CNI", label: "CNI ivoirienne", requiresBack: true },
  { value: "PASSPORT", label: "Passeport", requiresBack: false },
  { value: "RESIDENCE_PERMIT", label: "Carte de séjour", requiresBack: true },
  { value: "CONSULAR_CARD", label: "Carte consulaire", requiresBack: false },
];

type PaymentResult = {
  reference: string;
  totalXof: number;
  checkoutUrl: string;
  wave: {
    number: string;
    link: string | null;
    merchantName: string;
    qrUrl: string | null;
  };
};

type Phase = "identity" | "payment" | "done";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Deterministic key so that a page reload (which restores the chat messages,
 * and therefore this widget, from localStorage) does NOT show the identity
 * form again for a booking that was already created — preventing a duplicate.
 */
const storeKey = (d: BookingDraft) =>
  `bahia.iya.booking.${d.roomId}.${d.checkIn}.${d.checkOut}.${d.guests}`;

export default function BookingFinalizer({ draft }: { draft: BookingDraft }) {
  const [phase, setPhase] = useState<Phase>("identity");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore a previously confirmed booking (if any) so the QR/payment card
  // survives reloads instead of reverting to the identity form.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey(draft));
      if (raw) {
        const saved = JSON.parse(raw) as {
          phase: Phase;
          result: PaymentResult;
        };
        if (saved.result) {
          setResult(saved.result);
          setPhase(saved.phase === "done" ? "done" : "payment");
        }
      }
    } catch {
      // ignore corrupt state
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(p: Phase, r: PaymentResult) {
    try {
      localStorage.setItem(storeKey(draft), JSON.stringify({ phase: p, result: r }));
    } catch {
      // ignore quota errors
    }
  }

  // Avoid a flash of the identity form before hydration decides the phase.
  if (!hydrated) return null;

  if (phase === "identity") {
    return (
      <IdentityStep
        draft={draft}
        onConfirmed={(r) => {
          setResult(r);
          setPhase("payment");
          persist("payment", r);
        }}
      />
    );
  }
  if (phase === "payment" && result) {
    return (
      <PaymentStep
        result={result}
        onPaid={() => {
          setPhase("done");
          persist("done", result);
        }}
      />
    );
  }
  if (phase === "done" && result) {
    return <DoneStep reference={result.reference} />;
  }
  return null;
}

/* ------------------------------ Identity ------------------------------ */

function IdentityStep({
  draft,
  onConfirmed,
}: {
  draft: BookingDraft;
  onConfirmed: (r: PaymentResult) => void;
}) {
  const [idType, setIdType] = useState<IdType>("CNI");
  const [idNumber, setIdNumber] = useState("");
  const [front, setFront] = useState<{ url: string; key: string; name: string } | null>(null);
  const [back, setBack] = useState<{ url: string; key: string; name: string } | null>(null);
  const [rgpd, setRgpd] = useState(false);
  const [uploading, setUploading] = useState<"front" | "back" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requiresBack = idType === "CNI" || idType === "RESIDENCE_PERMIT";

  async function upload(file: File, side: "front" | "back") {
    setUploading(side);
    setErrors((e) => ({ ...e, [side]: "" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec du téléversement");
      const stored = { url: json.url, key: json.key, name: file.name };
      if (side === "front") setFront(stored);
      else setBack(stored);
    } catch (e) {
      setErrors((er) => ({
        ...er,
        [side]: e instanceof Error ? e.message : "Échec du téléversement",
      }));
    } finally {
      setUploading(null);
    }
  }

  function confirm() {
    const e: Record<string, string> = {};
    if (idNumber.trim().length < 4) e.idNumber = "Numéro requis";
    if (!front) e.front = "Recto requis";
    if (requiresBack && !back) e.back = "Verso requis";
    if (!rgpd) e.rgpd = "Acceptation requise (loi ivoirienne)";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setTopError(null);
    startTransition(async () => {
      const res = await confirmChatBooking({
        roomId: draft.roomId,
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        guests: draft.guests,
        fullName: draft.fullName,
        email: draft.email,
        phone: draft.phone,
        nationality: draft.nationality,
        idType,
        idNumber: idNumber.trim(),
        idImageUrl: front!.url,
        idImageKey: front!.key,
        idImageBackUrl: back?.url || null,
        idImageBackKey: back?.key || null,
        rgpdAccepted: true,
      });
      if (res.ok) {
        onConfirmed({
          reference: res.data.reference,
          totalXof: res.data.totalXof,
          checkoutUrl: res.data.checkoutUrl,
          wave: res.data.wave,
        });
      } else {
        setTopError(res.error);
      }
    });
  }

  return (
    <Card>
      {/* Stay recap */}
      <div className="flex gap-3 items-center pb-3 border-b border-teal-100">
        <div
          className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0"
          style={{ backgroundImage: `url('${draft.imageUrl}')` }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-teal-700 text-sm truncate">
            {draft.roomType === "VILLA" ? "Villa" : "Chambre"} {draft.roomName}
          </div>
          <div className="text-teal-500 text-[11px] flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-0.5">
              <Calendar className="w-3 h-3" /> {fmtDate(draft.checkIn)} →{" "}
              {fmtDate(draft.checkOut)}
            </span>
            <span className="flex items-center gap-0.5">
              <Users className="w-3 h-3" /> {draft.guests}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-teal-500 text-[10px]">Total</div>
          <div className="font-display text-teal-700 text-sm">
            {draft.totalFormatted}
          </div>
        </div>
      </div>

      {/* Legal notice */}
      <div className="rounded-xl bg-teal-500/5 border border-teal-200 p-2.5 flex gap-2 items-start mt-3">
        <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
        <div className="text-teal-700 text-[11px] leading-relaxed">
          Enregistrement légal des voyageurs (Loi ivoirienne n° 2013-450). Vos
          données sont chiffrées et conservées de façon sécurisée.
        </div>
      </div>

      {/* ID type */}
      <div className="mt-3">
        <div className="text-teal-700 text-xs font-medium mb-1.5">
          Type de pièce
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ID_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setIdType(t.value)}
              className={`text-left px-2.5 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                idType === t.value
                  ? "border-sand-500 bg-sand-500/10 text-teal-700"
                  : "border-teal-100 bg-white text-teal-600 hover:border-teal-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ID number */}
      <div className="mt-3">
        <div className="text-teal-700 text-xs font-medium mb-1.5">
          Numéro de la pièce
        </div>
        <input
          value={idNumber}
          onChange={(e) => {
            setIdNumber(e.target.value);
            setErrors((er) => ({ ...er, idNumber: "" }));
          }}
          placeholder="C0123456789"
          autoCapitalize="characters"
          className="w-full px-3 py-2 rounded-lg border border-teal-100 bg-white text-teal-700 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400"
        />
        <FieldError msg={errors.idNumber} />
      </div>

      {/* Uploads */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <UploadZone
          label="Recto"
          required
          stored={front}
          uploading={uploading === "front"}
          disabled={uploading !== null || pending}
          onFile={(f) => upload(f, "front")}
          error={errors.front}
        />
        <UploadZone
          label="Verso"
          required={requiresBack}
          stored={back}
          uploading={uploading === "back"}
          disabled={uploading !== null || pending}
          onFile={(f) => upload(f, "back")}
          error={errors.back}
        />
      </div>

      {/* RGPD */}
      <label className="flex gap-2 items-start cursor-pointer mt-3">
        <input
          type="checkbox"
          checked={rgpd}
          onChange={(e) => {
            setRgpd(e.target.checked);
            setErrors((er) => ({ ...er, rgpd: "" }));
          }}
          className="mt-0.5 w-4 h-4 accent-sand-600 shrink-0"
        />
        <span className="text-teal-700 text-[11px] leading-relaxed">
          J'accepte que Bahia conserve mes données d'identité aux fins de la
          déclaration légale des voyageurs (Loi n° 2013-450 / RGPD).
        </span>
      </label>
      <FieldError msg={errors.rgpd} />

      {topError && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-red-700 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {topError}
        </div>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={pending || uploading !== null}
        className="w-full mt-3 px-4 py-2.5 rounded-full bg-sand-500 hover:bg-sand-400 active:bg-sand-600 text-teal-800 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Création…
          </>
        ) : (
          <>
            Confirmer & payer {draft.totalFormatted}
          </>
        )}
      </button>
    </Card>
  );
}

/* ------------------------------ Payment ------------------------------ */

function PaymentStep({
  result,
  onPaid,
}: {
  result: PaymentResult;
  onPaid: () => void;
}) {
  const [waveRef, setWaveRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function copyRef() {
    navigator.clipboard.writeText(result.reference).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitWaveReference({
        bookingReference: result.reference,
        waveReference: waveRef.trim(),
      });
      if (res.ok) onPaid();
      else setError(res.error);
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 text-[#3939FF] mb-1">
        <Smartphone className="w-4 h-4" />
        <span className="font-display text-base">Payez via Wave</span>
      </div>
      <div className="text-teal-500 text-[11px] mb-3">
        Réservation <strong className="font-mono">{result.reference}</strong>{" "}
        créée. Scannez et réglez le montant exact.
      </div>

      {/* QR */}
      <div className="mx-auto w-40 h-40 rounded-xl bg-ivory-100 grid place-items-center border border-teal-100 overflow-hidden">
        {result.wave.qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.wave.qrUrl}
            alt="QR Wave Bahia"
            className="w-full h-full object-contain p-1.5"
          />
        ) : (
          <QrPlaceholder
            value={result.wave.link ?? undefined}
            seed={result.reference}
          />
        )}
      </div>

      {result.wave.link && (
        <a
          href={result.wave.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center mt-2 text-sand-700 hover:text-sand-800 text-[11px] underline"
        >
          Ouvrir le lien Wave →
        </a>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-ivory-100 border border-teal-100 py-2">
          <div className="text-teal-500 text-[9px] uppercase tracking-widest">
            Numéro Wave
          </div>
          <div className="font-mono font-semibold text-teal-700 text-xs">
            {result.wave.number}
          </div>
        </div>
        <div className="rounded-lg bg-ivory-100 border border-teal-100 py-2">
          <div className="text-teal-500 text-[9px] uppercase tracking-widest">
            Montant exact
          </div>
          <div className="font-display text-teal-700 text-sm">
            {formatXOF(result.totalXof)}
          </div>
        </div>
      </div>

      {/* Reference + copy */}
      <div className="mt-2 flex items-center gap-2 bg-ivory-100 rounded-lg px-3 py-2 border border-teal-100">
        <span className="font-mono text-teal-700 text-xs flex-1 truncate">
          {result.reference}
        </span>
        <button
          onClick={copyRef}
          className="shrink-0 px-2 py-1 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 text-[10px] font-medium flex items-center gap-1"
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

      {/* Wave transaction id */}
      <div className="mt-3">
        <div className="text-teal-700 text-xs font-medium mb-1.5">
          Identifiant de transaction Wave
        </div>
        <input
          value={waveRef}
          onChange={(e) => setWaveRef(e.target.value)}
          placeholder="TX-XXXXXXXXXX"
          className="w-full px-3 py-2 rounded-lg border border-teal-100 bg-white text-teal-700 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400"
        />
        <div className="text-teal-500/80 text-[10px] mt-1">
          Reçu par SMS après le paiement Wave.
        </div>
      </div>

      {error && (
        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-red-700 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || waveRef.trim().length < 4}
        className="w-full mt-3 px-4 py-2.5 rounded-full bg-sand-500 hover:bg-sand-400 active:bg-sand-600 text-teal-800 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Envoi…
          </>
        ) : (
          <>Valider mon paiement Wave</>
        )}
      </button>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-teal-500 text-[10px]">
        <Lock className="w-3 h-3" />
        Vérification manuelle sous 30 min · Confirmation par email
      </div>
    </Card>
  );
}

/* ------------------------------ Done ------------------------------ */

function DoneStep({ reference }: { reference: string }) {
  return (
    <Card>
      <div className="text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-sand-500/20 grid place-items-center mb-3">
          <CheckCircle2 className="w-7 h-7 text-sand-600" />
        </div>
        <div className="font-display text-teal-700 text-base mb-1">
          Paiement reçu, en vérification.
        </div>
        <p className="text-teal-600/85 text-xs leading-relaxed max-w-xs mx-auto">
          Notre équipe rapproche votre paiement Wave sous 30 minutes. Vous
          recevrez la confirmation finale par email avec les détails de votre
          arrivée à Assinie. 🌴
        </p>
        <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-ivory-200 text-teal-700 font-mono text-xs">
          {reference}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ Shared bits ------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-9 rounded-2xl bg-white border border-teal-100 shadow-sm p-3.5">
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="text-red-600 text-[10px] mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" /> {msg}
    </div>
  );
}

function UploadZone({
  label,
  required,
  stored,
  uploading,
  disabled,
  onFile,
  error,
}: {
  label: string;
  required: boolean;
  stored: { name: string } | null;
  uploading: boolean;
  disabled: boolean;
  onFile: (f: File) => void;
  error?: string;
}) {
  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors min-h-[88px] ${
          disabled && !uploading
            ? "opacity-60 cursor-not-allowed"
            : stored
              ? "border-sand-500 bg-sand-500/5"
              : "border-teal-200 bg-white hover:border-teal-400"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <div className="text-[9px] uppercase tracking-widest text-teal-500 font-semibold">
          {label}{" "}
          {required ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-teal-400 normal-case font-normal">(opt.)</span>
          )}
        </div>
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
            <div className="text-teal-600 text-[10px]">Téléversement…</div>
          </>
        ) : stored ? (
          <>
            <FileCheck2 className="w-5 h-5 text-sand-600" />
            <div className="text-teal-700 text-[10px] font-medium text-center line-clamp-1 px-1">
              {stored.name}
            </div>
            <div className="text-teal-500 text-[9px]">Remplacer</div>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-teal-400" />
            <div className="text-teal-700 text-[10px] text-center">
              Photo / fichier
            </div>
          </>
        )}
      </label>
      <FieldError msg={error} />
    </div>
  );
}
