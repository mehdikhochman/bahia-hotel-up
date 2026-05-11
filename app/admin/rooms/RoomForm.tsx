"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { Room } from "@prisma/client";
import type { RoomFormResult } from "./actions";

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-teal-100 bg-white text-teal-700 focus:outline-none focus:ring-2 focus:ring-sand-500 focus:border-sand-500 text-sm";

type Props = {
  initial?: Room | null;
  action: (state: RoomFormResult, fd: FormData) => Promise<RoomFormResult>;
  submitLabel?: string;
};

export default function RoomForm({
  initial,
  action,
  submitLabel = "Enregistrer",
}: Props) {
  const [state, formAction] = useFormState<RoomFormResult, FormData>(
    action,
    { ok: false, error: "" }
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");

  const err = (k: string) =>
    !state.ok && state.fieldErrors ? state.fieldErrors[k] : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nom" error={err("name")}>
          <input
            required
            name="name"
            defaultValue={initial?.name}
            className={inputCls}
            placeholder="Villa Lagune"
          />
        </Field>
        <Field label="Slug (URL)" error={err("slug")} hint="lettres, chiffres, tirets">
          <input
            required
            name="slug"
            defaultValue={initial?.slug}
            className={inputCls}
            placeholder="villa-lagune"
            autoCapitalize="none"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Type" error={err("type")}>
          <select
            required
            name="type"
            defaultValue={initial?.type ?? "VILLA"}
            className={inputCls}
          >
            <option value="VILLA">Villa</option>
            <option value="ROOM">Chambre</option>
          </select>
        </Field>
        <Field label="Prix / nuit (XOF)" error={err("pricePerNight")}>
          <input
            required
            type="number"
            name="pricePerNight"
            defaultValue={initial?.pricePerNight}
            min={1000}
            step={1000}
            className={inputCls}
            placeholder="180000"
          />
        </Field>
      </div>

      <Field label="Tagline" error={err("tagline")}>
        <input
          required
          name="tagline"
          defaultValue={initial?.tagline}
          className={inputCls}
          placeholder="Vue sur la lagune des Éburnéens"
        />
      </Field>

      <Field label="Description" error={err("description")}>
        <textarea
          required
          name="description"
          defaultValue={initial?.description}
          rows={3}
          className={inputCls + " min-h-[88px]"}
        />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Capacité (pers.)" error={err("capacity")}>
          <input
            required
            type="number"
            name="capacity"
            defaultValue={initial?.capacity ?? 2}
            min={1}
            max={20}
            className={inputCls}
          />
        </Field>
        <Field label="Surface (m²)" error={err("surfaceSqm")}>
          <input
            required
            type="number"
            name="surfaceSqm"
            defaultValue={initial?.surfaceSqm ?? 40}
            min={5}
            className={inputCls}
          />
        </Field>
        <Field
          label="Unités identiques"
          error={err("totalUnits")}
          hint="Ex : 5 chambres identiques de cette catégorie"
        >
          <input
            required
            type="number"
            name="totalUnits"
            defaultValue={initial?.totalUnits ?? 1}
            min={1}
            max={100}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="URL de l'image" error={err("imageUrl")} hint="Idéalement 1600×1067, hostée sur Vercel Blob ou Cloudinary">
        <input
          required
          type="url"
          name="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={inputCls}
          placeholder="https://images.unsplash.com/..."
        />
        {imageUrl && (
          <div
            className="mt-2 aspect-video rounded-xl bg-cover bg-center bg-ivory-200 border border-teal-100"
            style={{ backgroundImage: `url('${imageUrl}')` }}
          />
        )}
      </Field>

      <Field
        label="Équipements"
        error={err("amenities")}
        hint="Séparés par des virgules — ex: AC, Wi-Fi, Vue océan, Piscine privée"
      >
        <input
          name="amenities"
          defaultValue={initial?.amenities.join(", ") ?? ""}
          className={inputCls}
          placeholder="AC, Wi-Fi, Vue océan, Plage privée"
        />
      </Field>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="w-4 h-4 accent-sand-600"
        />
        <span className="text-teal-700 text-sm">
          Actif (visible sur le site public)
        </span>
      </label>

      {state.ok && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Hébergement enregistré.
        </div>
      )}
      {!state.ok && state.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
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
        label
      )}
    </button>
  );
}

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
