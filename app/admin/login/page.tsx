import Link from "next/link";
import { redirect } from "next/navigation";
import { Waves } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connexion staff — Bahia",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  // Already authenticated → straight to dashboard
  if (await getAdminSession()) redirect(searchParams.from || "/admin");

  return (
    <main className="min-h-[100svh] bg-teal-gradient grid place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-ivory-100"
          >
            <span className="w-9 h-9 grid place-items-center rounded-full bg-ivory-100 text-teal-600">
              <Waves className="w-4 h-4" />
            </span>
            <span className="font-display text-3xl">Bahia</span>
          </Link>
          <h1 className="font-display text-2xl md:text-3xl text-ivory-100">
            Espace personnel
          </h1>
          <p className="text-ivory-100/70 text-sm mt-1">
            Réservé au staff de l'hôtel
          </p>
        </div>

        <div className="bg-ivory-100 rounded-3xl p-6 md:p-8 shadow-soft">
          <LoginForm from={searchParams.from} />
        </div>

        <p className="text-center text-ivory-100/60 text-xs mt-6">
          Accès journalisé. Toute consultation de pièce d'identité est tracée.
        </p>
      </div>
    </main>
  );
}
