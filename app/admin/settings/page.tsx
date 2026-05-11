import { Settings as SettingsIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getWaveSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paramètres — Bahia",
  robots: { index: false },
};

export default async function SettingsPage() {
  await requireAdmin();
  const initial = await getWaveSettings();

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="w-9 h-9 grid place-items-center rounded-full bg-teal-500 text-ivory-100 shrink-0">
          <SettingsIcon className="w-4 h-4" />
        </span>
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl text-teal-700">
          Paramètres Wave
        </h1>
      </div>
      <p className="text-teal-500 text-xs sm:text-sm mb-5 sm:mb-6">
        Numéro, lien de paiement et nom affiché aux clients. Aucun redéploiement
        nécessaire — les changements sont actifs dès l'enregistrement.
      </p>

      <div className="bg-white rounded-2xl border border-teal-100 p-4 sm:p-5 md:p-7">
        <SettingsForm initial={initial} />
      </div>
    </div>
  );
}
