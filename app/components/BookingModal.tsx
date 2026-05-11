"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Calendar,
  Users,
  BedDouble,
  ShieldCheck,
  Upload,
  FileCheck2,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Lock,
  Loader2,
} from "lucide-react";
import type { SerializedRoom } from "@/types";
import { formatXOF } from "@/lib/utils";
import { computePricing } from "@/lib/pricing";
import { createBooking } from "@/app/actions/booking";
import AvailabilityCalendar from "./AvailabilityCalendar";

type Props = {
  open: boolean;
  rooms: SerializedRoom[];
  preselected: SerializedRoom | null;
  onClose: () => void;
};

const STEPS = ["Séjour", "Voyageur", "Identité", "Récap"] as const;

type IdType = "CNI" | "PASSPORT" | "CONSULAR_CARD" | "RESIDENCE_PERMIT";

type FormState = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  idType: IdType;
  idNumber: string;
  idImageUrl: string;
  idImageKey: string;
  idFileName: string;
  idImageBackUrl: string;
  idImageBackKey: string;
  idFileBackName: string;
  rgpdAccepted: boolean;
};

const ID_TYPES: Array<{
  value: IdType;
  label: string;
  note: string;
  requiresBack: boolean;
}> = [
  {
    value: "CNI",
    label: "CNI ivoirienne",
    note: "Carte nationale d'identité",
    requiresBack: true,
  },
  {
    value: "PASSPORT",
    label: "Passeport",
    note: "Document international",
    requiresBack: false,
  },
  {
    value: "RESIDENCE_PERMIT",
    label: "Carte de séjour",
    note: "Résidents non-ivoiriens",
    requiresBack: true,
  },
  {
    value: "CONSULAR_CARD",
    label: "Carte consulaire",
    note: "Ou attestation officielle",
    requiresBack: false,
  },
];

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-teal-100 bg-white text-teal-700 focus:outline-none focus:ring-2 focus:ring-sand-500 focus:border-sand-500 transition-colors text-sm";

export default function BookingModal({ open, rooms, preselected, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(() => ({
    roomId: preselected?.id || rooms[0]?.id || "",
    checkIn: "",
    checkOut: "",
    guests: 2,
    fullName: "",
    email: "",
    phone: "",
    nationality: "Ivoirienne",
    idType: "CNI",
    idNumber: "",
    idImageUrl: "",
    idImageKey: "",
    idFileName: "",
    idImageBackUrl: "",
    idImageBackKey: "",
    idFileBackName: "",
    rgpdAccepted: false,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  useEffect(() => {
    if (open && preselected) {
      setData((d) => ({ ...d, roomId: preselected.id }));
      setStep(0);
    }
  }, [open, preselected]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(0);
        setErrors({});
        setTopError(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const room = useMemo(
    () => rooms.find((r) => r.id === data.roomId) ?? rooms[0],
    [data.roomId, rooms]
  );

  const nights = useMemo(() => {
    if (!data.checkIn || !data.checkOut) return 0;
    const a = new Date(data.checkIn).getTime();
    const b = new Date(data.checkOut).getTime();
    return Math.max(0, Math.round((b - a) / 86_400_000));
  }, [data.checkIn, data.checkOut]);

  const pricing = useMemo(
    () =>
      computePricing({
        pricePerNight: room?.pricePerNight ?? 0,
        nights,
        guests: data.guests || 0,
      }),
    [room?.pricePerNight, nights, data.guests]
  );

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k as string]: "" }));
  };

  const [uploadingSide, setUploadingSide] = useState<"front" | "back" | null>(null);

  async function uploadIdFile(file: File, side: "front" | "back") {
    setUploadingSide(side);
    setErrors((e) => ({
      ...e,
      [side === "front" ? "idImageUrl" : "idImageBackUrl"]: "",
    }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec du téléversement");
      setData((d) =>
        side === "front"
          ? { ...d, idImageUrl: json.url, idImageKey: json.key, idFileName: file.name }
          : {
              ...d,
              idImageBackUrl: json.url,
              idImageBackKey: json.key,
              idFileBackName: file.name,
            }
      );
    } catch (e) {
      setErrors((er) => ({
        ...er,
        [side === "front" ? "idImageUrl" : "idImageBackUrl"]:
          e instanceof Error ? e.message : "Échec du téléversement",
      }));
    } finally {
      setUploadingSide(null);
    }
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!data.roomId) e.roomId = "Hébergement requis";
      if (!data.checkIn) e.checkIn = "Date d'arrivée requise";
      if (!data.checkOut) e.checkOut = "Date de départ requise";
      if (data.checkIn && data.checkOut && nights <= 0)
        e.checkOut = "La date de départ doit suivre l'arrivée";
      if (!data.guests || data.guests < 1) e.guests = "Au moins 1 voyageur";
      if (room && data.guests > room.capacity)
        e.guests = `Maximum ${room.capacity} voyageurs`;
    }
    if (step === 1) {
      if (!data.fullName.trim()) e.fullName = "Nom complet requis";
      if (!/^\S+@\S+\.\S+$/.test(data.email)) e.email = "Email invalide";
      if (!/^[+0-9 ]{8,}$/.test(data.phone)) e.phone = "Téléphone invalide";
      if (!data.nationality.trim()) e.nationality = "Requis";
    }
    if (step === 2) {
      if (!data.idNumber.trim()) e.idNumber = "Numéro requis";
      if (!data.idImageUrl) e.idImageUrl = "Téléversez le recto";
      const requiresBack =
        data.idType === "CNI" || data.idType === "RESIDENCE_PERMIT";
      if (requiresBack && !data.idImageBackUrl) {
        e.idImageBackUrl = "Le verso est obligatoire pour ce document";
      }
      if (!data.rgpdAccepted)
        e.rgpdAccepted = "Acceptation requise (loi ivoirienne)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setTopError(null);
    startTransition(async () => {
      const result = await createBooking({
        roomId: data.roomId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        nationality: data.nationality,
        idType: data.idType,
        idNumber: data.idNumber,
        idImageUrl: data.idImageUrl,
        idImageKey: data.idImageKey,
        idImageBackUrl: data.idImageBackUrl || null,
        idImageBackKey: data.idImageBackKey || null,
        rgpdAccepted: data.rgpdAccepted,
      });
      if (result.ok) {
        router.push(result.data.checkoutUrl);
      } else {
        setTopError(result.error);
        if (result.fieldErrors) setErrors((e) => ({ ...e, ...result.fieldErrors }));
      }
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-teal-900/70 backdrop-blur-sm md:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Réservation"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            className="relative w-full md:max-w-3xl bg-ivory-100 md:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="relative px-5 md:px-8 py-4 md:py-5 border-b border-teal-100 bg-white/60 backdrop-blur-sm">
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full hover:bg-teal-100 text-teal-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="font-display text-xl md:text-2xl text-teal-700 pr-10">
                Réservation Bahia
              </div>
              <div className="text-teal-500 text-xs md:text-sm mt-0.5">
                Étape {step + 1} / {STEPS.length} — {STEPS[step]}
              </div>
              <div className="mt-3.5 flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      i <= step ? "bg-sand-500" : "bg-teal-100"
                    }`}
                  />
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 overscroll-contain">
              {step === 0 && (
                <StepStay
                  data={data}
                  update={update}
                  errors={errors}
                  rooms={rooms}
                  room={room}
                  nights={nights}
                  pricing={pricing}
                />
              )}
              {step === 1 && <StepGuest data={data} update={update} errors={errors} />}
              {step === 2 && (
                <StepIdentity
                  data={data}
                  update={update}
                  errors={errors}
                  uploadingSide={uploadingSide}
                  onFile={uploadIdFile}
                />
              )}
              {step === 3 && (
                <StepRecap
                  data={data}
                  room={room}
                  nights={nights}
                  pricing={pricing}
                  topError={topError}
                />
              )}
            </div>

            <footer className="px-4 md:px-8 py-3 md:py-4 border-t border-teal-100 bg-white/80 backdrop-blur-sm flex items-center justify-between gap-3 safe-bottom">
              <button
                onClick={back}
                disabled={step === 0 || pending}
                className="px-3 py-2.5 rounded-full text-teal-600 disabled:opacity-30 hover:bg-teal-100 transition-colors text-sm flex items-center gap-1.5 min-h-[44px] touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Retour</span>
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  className="flex-1 sm:flex-initial px-5 sm:px-6 py-3 rounded-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-ivory-100 text-sm font-medium flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={pending}
                  className="flex-1 sm:flex-initial px-5 sm:px-6 py-3 rounded-full bg-sand-500 hover:bg-sand-400 active:bg-sand-600 text-teal-800 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 min-h-[44px] touch-manipulation"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Création...
                    </>
                  ) : (
                    <>
                      Confirmer & payer <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Sub-steps ---------- */

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-teal-700 text-sm font-medium mb-1.5">{label}</div>
      {children}
      {hint && !error && (
        <div className="text-teal-500/80 text-xs mt-1">{hint}</div>
      )}
      {error && (
        <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}
    </label>
  );
}

type SubProps = {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
};

function StepStay({
  data,
  update,
  errors,
  rooms,
  room,
  nights,
  pricing,
}: SubProps & {
  rooms: SerializedRoom[];
  room: SerializedRoom | undefined;
  nights: number;
  pricing: ReturnType<typeof computePricing>;
}) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="space-y-5">
      <Field label="Hébergement" error={errors.roomId}>
        <select
          className={inputCls}
          value={data.roomId}
          onChange={(e) => update("roomId", e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.type === "VILLA" ? "Villa" : "Chambre"} · {r.name} —{" "}
              {formatXOF(r.pricePerNight)} / nuit
            </option>
          ))}
        </select>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Arrivée" error={errors.checkIn}>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
            <input
              type="date"
              className={`${inputCls} pl-10`}
              value={data.checkIn}
              min={today}
              onChange={(e) => update("checkIn", e.target.value)}
            />
          </div>
        </Field>
        <Field label="Départ" error={errors.checkOut}>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
            <input
              type="date"
              className={`${inputCls} pl-10`}
              value={data.checkOut}
              min={data.checkIn || today}
              onChange={(e) => update("checkOut", e.target.value)}
            />
          </div>
        </Field>
      </div>

      <Field label="Voyageurs" error={errors.guests}>
        <div className="relative">
          <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
          <input
            type="number"
            min={1}
            max={12}
            inputMode="numeric"
            className={`${inputCls} pl-10`}
            value={data.guests}
            onChange={(e) => update("guests", parseInt(e.target.value || "0", 10))}
          />
        </div>
      </Field>

      {data.roomId && (
        <div>
          <div className="text-teal-700 text-sm font-medium mb-1.5">
            Calendrier de disponibilité
          </div>
          <AvailabilityCalendar
            roomId={data.roomId}
            checkIn={data.checkIn}
            checkOut={data.checkOut}
            onChange={(next) => {
              update("checkIn", next.checkIn);
              update("checkOut", next.checkOut);
            }}
          />
          <div className="text-teal-500/80 text-xs mt-1.5">
            Cliquez deux dates pour sélectionner votre séjour. Les nuits
            indisponibles sont barrées.
          </div>
        </div>
      )}

      {room && (
        <div className="rounded-2xl bg-ivory-200/50 border border-ivory-200 p-4 flex gap-4">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url('${room.imageUrl}')` }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sand-600 text-xs uppercase tracking-wider">
              <BedDouble className="w-3.5 h-3.5" />
              {room.type === "VILLA" ? "Villa" : "Chambre"}
            </div>
            <div className="font-display text-teal-700 text-base sm:text-lg truncate">
              {room.name}
            </div>
            <div className="text-teal-500 text-xs">
              {room.capacity} pers. · {room.surfaceSqm} m²
            </div>
          </div>
        </div>
      )}

      {nights > 0 && room && (
        <PricingBreakdown
          pricePerNight={room.pricePerNight}
          nights={nights}
          pricing={pricing}
        />
      )}
    </div>
  );
}

function PricingBreakdown({
  pricePerNight,
  nights,
  pricing,
}: {
  pricePerNight: number;
  nights: number;
  pricing: ReturnType<typeof computePricing>;
}) {
  return (
    <div className="rounded-2xl bg-white border border-teal-100 p-4 space-y-1.5 text-sm">
      <Line
        label={`${nights} nuit${nights > 1 ? "s" : ""} × ${formatXOF(pricePerNight)}`}
        value={formatXOF(pricing.subtotal)}
      />
      <Line label="TVA (18 %)" value={formatXOF(pricing.vat)} muted />
      <Line label="Taxe de séjour" value={formatXOF(pricing.cityTax)} muted />
      <div className="border-t border-teal-100 pt-2 mt-1 flex justify-between items-baseline">
        <span className="text-teal-700 font-medium">Total à payer</span>
        <span className="font-display text-teal-700 text-xl sm:text-2xl">
          {formatXOF(pricing.total)}
        </span>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={muted ? "text-teal-500" : "text-teal-700"}>{label}</span>
      <span className={muted ? "text-teal-600" : "text-teal-700 font-medium"}>
        {value}
      </span>
    </div>
  );
}

function StepGuest({ data, update, errors }: SubProps) {
  return (
    <div className="space-y-5">
      <Field label="Nom complet" error={errors.fullName}>
        <input
          className={inputCls}
          value={data.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Tel qu'inscrit sur votre pièce d'identité"
          autoComplete="name"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email" error={errors.email}>
          <input
            type="email"
            inputMode="email"
            className={inputCls}
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="vous@exemple.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Téléphone" error={errors.phone}>
          <input
            type="tel"
            inputMode="tel"
            className={inputCls}
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+225 07 00 00 00 00"
            autoComplete="tel"
          />
        </Field>
      </div>

      <Field label="Nationalité" error={errors.nationality}>
        <input
          className={inputCls}
          value={data.nationality}
          onChange={(e) => update("nationality", e.target.value)}
        />
      </Field>
    </div>
  );
}

function StepIdentity({
  data,
  update,
  errors,
  uploadingSide,
  onFile,
}: SubProps & {
  uploadingSide: "front" | "back" | null;
  onFile: (f: File, side: "front" | "back") => void;
}) {
  const requiresBack =
    data.idType === "CNI" || data.idType === "RESIDENCE_PERMIT";
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-teal-500/5 border border-teal-200 p-4 flex gap-3 items-start">
        <ShieldCheck className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
        <div className="text-teal-700 text-sm leading-relaxed">
          <strong>Enregistrement légal des voyageurs.</strong> Conformément à la
          réglementation ivoirienne (Direction de la Surveillance du
          Territoire), tout établissement hôtelier conserve une copie de la
          pièce d'identité de chaque voyageur. Vos données sont chiffrées et
          conservées selon la <em>Loi n° 2013-450</em>.
        </div>
      </div>

      <Field label="Type de pièce">
        <div className="grid sm:grid-cols-3 gap-2.5">
          {ID_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update("idType", t.value)}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                data.idType === t.value
                  ? "border-sand-500 bg-sand-500/10"
                  : "border-teal-100 bg-white hover:border-teal-300"
              }`}
            >
              <div className="text-teal-700 font-medium text-sm">{t.label}</div>
              <div className="text-teal-500 text-xs mt-0.5">{t.note}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Numéro de la pièce"
        error={errors.idNumber}
        hint="Tel qu'imprimé sur le document"
      >
        <input
          className={inputCls}
          value={data.idNumber}
          onChange={(e) => update("idNumber", e.target.value)}
          placeholder="C0123456789"
          autoCapitalize="characters"
        />
      </Field>

      <div>
        <div className="text-teal-700 text-sm font-medium mb-2">
          Photos de la pièce
          <span className="text-teal-500/80 text-xs font-normal ml-2">
            JPG, PNG, WEBP ou PDF — 8 Mo max
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <UploadZone
            side="front"
            label="Recto"
            required
            url={data.idImageUrl}
            fileName={data.idFileName}
            uploading={uploadingSide === "front"}
            disabled={uploadingSide !== null}
            onFile={onFile}
            error={errors.idImageUrl}
          />
          <UploadZone
            side="back"
            label="Verso"
            required={requiresBack}
            url={data.idImageBackUrl}
            fileName={data.idFileBackName}
            uploading={uploadingSide === "back"}
            disabled={uploadingSide !== null}
            onFile={onFile}
            error={errors.idImageBackUrl}
            hint={
              !requiresBack
                ? "Optionnel pour ce type de document"
                : undefined
            }
          />
        </div>
        {requiresBack && (
          <div className="text-teal-500/80 text-xs mt-2">
            Le verso est obligatoire pour la <strong>CNI</strong> et la{" "}
            <strong>carte de séjour</strong>.
          </div>
        )}
      </div>

      <label className="flex gap-3 items-start cursor-pointer">
        <input
          type="checkbox"
          checked={data.rgpdAccepted}
          onChange={(e) => update("rgpdAccepted", e.target.checked)}
          className="mt-1 w-4 h-4 accent-sand-600 shrink-0"
        />
        <div className="text-teal-700 text-sm leading-relaxed">
          J'accepte que <strong>Bahia</strong> conserve mes données d'identité
          aux fins de la déclaration légale des voyageurs (Loi ivoirienne
          n° 2013-450 / RGPD). Droits d'accès, de rectification et de
          suppression exerçables à tout moment.
          {errors.rgpdAccepted && (
            <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.rgpdAccepted}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

function StepRecap({
  data,
  room,
  nights,
  pricing,
  topError,
}: {
  data: FormState;
  room: SerializedRoom | undefined;
  nights: number;
  pricing: ReturnType<typeof computePricing>;
  topError: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-teal-100 p-5">
        <div className="font-display text-teal-700 text-lg mb-3">
          Récapitulatif
        </div>
        <Row label="Hébergement" value={`${room?.type === "VILLA" ? "Villa" : "Chambre"} ${room?.name ?? ""}`} />
        <Row label="Arrivée" value={data.checkIn} />
        <Row label="Départ" value={data.checkOut} />
        <Row label="Nuits" value={nights} />
        <Row label="Voyageurs" value={data.guests} />
        <Row label="Voyageur" value={data.fullName} />
        <Row label="Contact" value={`${data.email} · ${data.phone}`} />
        <Row
          label="Pièce"
          value={`${
            ID_TYPES.find((t) => t.value === data.idType)?.label ?? data.idType
          } · ${data.idNumber}${
            data.idImageBackUrl ? " (recto + verso)" : " (recto)"
          }`}
        />
        <div className="border-t border-teal-100 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm text-teal-600">
            <span>Sous-total ({nights} nuit{nights > 1 ? "s" : ""})</span>
            <span>{formatXOF(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-teal-500">
            <span>TVA 18 %</span>
            <span>{formatXOF(pricing.vat)}</span>
          </div>
          <div className="flex justify-between text-sm text-teal-500">
            <span>Taxe de séjour</span>
            <span>{formatXOF(pricing.cityTax)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-teal-100">
            <span className="text-teal-700 font-medium">Total à payer</span>
            <span className="font-display text-teal-700 text-2xl">
              {formatXOF(pricing.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-sand-500/10 border border-sand-200 p-4 flex gap-3 items-start">
        <Lock className="w-4 h-4 text-sand-600 mt-0.5 shrink-0" />
        <div className="text-teal-700 text-sm leading-relaxed">
          Une référence unique sera générée. Vous paierez ensuite{" "}
          <strong>via Wave</strong> à la page de paiement (QR code + numéro).
          Votre place est garantie 30 min après la confirmation du paiement.
        </div>
      </div>

      {topError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {topError}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-teal-500">{label}</span>
      <span className="text-teal-700 font-medium text-right break-all">
        {value || "—"}
      </span>
    </div>
  );
}

function UploadZone({
  side,
  label,
  required,
  url,
  fileName,
  uploading,
  disabled,
  onFile,
  error,
  hint,
}: {
  side: "front" | "back";
  label: string;
  required: boolean;
  url: string;
  fileName: string;
  uploading: boolean;
  disabled: boolean;
  onFile: (f: File, side: "front" | "back") => void;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-1.5 px-3 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[150px] ${
          disabled && !uploading
            ? "opacity-60 cursor-not-allowed"
            : url
            ? "border-sand-500 bg-sand-500/5"
            : "border-teal-200 bg-white hover:border-teal-400 hover:bg-teal-500/5"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f, side);
          }}
        />
        <div className="text-[10px] uppercase tracking-widest text-teal-500 font-semibold">
          {label}{" "}
          {required ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-teal-400 normal-case font-normal">(optionnel)</span>
          )}
        </div>
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
            <div className="text-teal-700 text-xs font-medium">
              Téléversement…
            </div>
          </>
        ) : url ? (
          <>
            <FileCheck2 className="w-6 h-6 text-sand-600" />
            <div className="text-teal-700 text-xs font-medium break-all px-1 text-center line-clamp-2">
              {fileName}
            </div>
            <div className="text-teal-500 text-[11px]">Remplacer</div>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-teal-400" />
            <div className="text-teal-700 text-xs font-medium text-center">
              Cliquez ou prenez en photo
            </div>
          </>
        )}
      </label>
      {hint && !error && (
        <div className="text-teal-500/80 text-[11px] mt-1">{hint}</div>
      )}
      {error && (
        <div className="text-red-600 text-[11px] mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  );
}
