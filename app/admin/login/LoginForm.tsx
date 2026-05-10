"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "./actions";

type Props = { from?: string };

export default function LoginForm({ from }: Props) {
  const [state, action] = useFormState(signIn, { error: "" } as { error: string });

  return (
    <form action={action} className="space-y-4">
      {from && <input type="hidden" name="from" value={from} />}

      <label className="block">
        <div className="text-teal-700 text-sm font-medium mb-1.5">Email</div>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
          <input
            required
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-teal-100 bg-white text-teal-700 focus:outline-none focus:ring-2 focus:ring-sand-500 text-sm"
            placeholder="staff@bahia-assinie.ci"
          />
        </div>
      </label>

      <label className="block">
        <div className="text-teal-700 text-sm font-medium mb-1.5">Mot de passe</div>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
          <input
            required
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-teal-100 bg-white text-teal-700 focus:outline-none focus:ring-2 focus:ring-sand-500 text-sm"
            placeholder="••••••••"
          />
        </div>
      </label>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-6 py-3.5 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Connexion...
        </>
      ) : (
        "Se connecter"
      )}
    </button>
  );
}
