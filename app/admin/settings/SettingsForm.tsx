"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  Link as LinkIcon,
  Building2,
  Smartphone,
} from "lucide-react";
import {
  updateWaveSettingsAction,
  type SettingsFormResult,
} from "./actions";

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-teal-100 bg-white text-teal-700 focus:outline-none focus:ring-2 focus:ring-sand-500 focus:border-sand-500 text-sm transition-colors";

type Props = {
  initial: {
    number: string;
    link: string;
    merchantName: string;
  };
};

export default function SettingsForm({ initial }: Props) {
  const [state, action] = useFormState<SettingsFormResult, FormData>(
    updateWaveSettingsAction,
    { ok: false, error: "" }
  );
  const [number, setNumber] = useState(initial.number);
  const [link, setLink] = useState(initial.link);
  const [merchantName, setMerchantName] = useState(initial.merchantName);

  const err = (k: string) =>
    !state.ok && state.fieldErrors ? state.fieldErrors[k] : undefined;

  return (
    <form action={action} className="grid lg:grid-cols-[1fr,320px] gap-6">
      <div className="space-y-5">
        <Field
          label="Numéro Wave Business"
          icon={Phone}
          hint="Format international, ex : +225 07 09 43 31 56"
          error={err("number")}
        >
          <input
            name="number"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={inputCls}
            placeholder="+225 07 00 00 00 00"
            autoComplete="off"
          />
        </Field>

        <Field
          label="Lien de paiement Wave"
          icon={LinkIcon}
          hint="Récupérable dans ton dashboard Wave Business → Payment Link"
          error={err("link")}
        >
          <input
            name="link"
            type="url"
            required
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={inputCls + " font-mono text-xs"}
            placeholder="https://pay.wave.com/m/M_ci_XXXXXXXXXX/c/ci/"
            autoComplete="off"
          />
        </Field>

        <Field
          label="Nom du bénéficiaire"
          icon={Building2}
          hint="Tel qu'affiché aux clients sur la page de paiement"
          error={err("merchantName")}
        >
          <input
            name="merchantName"
            required
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className={inputCls}
            placeholder="BAHIA HOTEL — ASSINIE"
          />
        </Field>

        {state.ok && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Modifications enregistrées. Tous les nouveaux clients verront ces
            valeurs immédiatement.
          </div>
        )}
        {!state.ok && state.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
          </div>
        )}

        <SubmitButton />
      </div>

      <aside className="space-y-4">
        <div className="text-teal-500 text-xs uppercase tracking-widest">
          Aperçu QR live
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#1A1AE0] via-[#3939FF] to-[#5C5CFF] p-5 text-white relative overflow-hidden">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest opacity-80">
              Wave Money
            </span>
          </div>
          <div className="font-display text-lg mt-0.5">{merchantName || "—"}</div>
          <div className="text-white/80 text-xs font-mono mt-1">
            {number || "—"}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-teal-100 p-4">
          {link ? (
            <div className="flex items-center justify-center">
              <QRCodeSVG
                value={link}
                size={220}
                level="M"
                marginSize={0}
                bgColor="#FFFFFF"
                fgColor="#00445C"
              />
            </div>
          ) : (
            <div className="aspect-square grid place-items-center text-teal-400 text-xs text-center px-4">
              Saisis un lien Wave valide pour voir le QR.
            </div>
          )}
        </div>

        <p className="text-teal-500 text-xs leading-relaxed">
          Le QR se régénère à chaque frappe. Il sera affiché tel quel sur la
          page de paiement <code className="text-sand-700">/checkout/...</code>
          dès enregistrement.
        </p>
      </aside>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-3 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 font-medium flex items-center gap-2 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
        </>
      ) : (
        "Enregistrer les modifications"
      )}
    </button>
  );
}

function Field({
  label,
  icon: Icon,
  hint,
  error,
  children,
}: {
  label: string;
  icon: typeof Phone;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 text-teal-700 text-sm font-medium mb-1.5">
        <Icon className="w-3.5 h-3.5 text-sand-600" />
        {label}
      </div>
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
