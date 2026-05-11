import { notFound } from "next/navigation";
import Link from "next/link";
import { Waves, ArrowLeft } from "lucide-react";
import { getBookingByReference } from "@/app/actions/booking";
import WaveCheckout from "@/app/components/WaveCheckout";

export const dynamic = "force-dynamic";

type Params = { reference: string };

export async function generateMetadata({ params }: { params: Params }) {
  return {
    title: `Paiement ${params.reference} — Bahia`,
    robots: { index: false },
  };
}

export default async function CheckoutPage({ params }: { params: Params }) {
  const booking = await getBookingByReference(params.reference);
  if (!booking) notFound();

  const alreadySubmitted =
    booking.status === "AWAITING_VERIFICATION" ||
    booking.status === "CONFIRMED" ||
    booking.payment?.status === "SUBMITTED" ||
    booking.payment?.status === "VERIFIED";

  return (
    <main className="min-h-screen bg-ivory-gradient">
      <header className="border-b border-ivory-200 bg-ivory-100/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 grid place-items-center rounded-full bg-teal-500 text-ivory-100">
              <Waves className="w-4 h-4" />
            </span>
            <span className="font-display text-xl text-teal-700">Bahia</span>
          </Link>
          <Link
            href="/"
            className="text-teal-500 text-sm flex items-center gap-1.5 hover:text-teal-700"
          >
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
        <p className="text-sand-600 text-xs sm:text-sm tracking-widest uppercase mb-2">
          Étape finale
        </p>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-teal-700 mb-2">
          Payez votre séjour via Wave
        </h1>
        <p className="text-teal-600/85 max-w-xl">
          Votre réservation <strong>{booking.reference}</strong> est créée.
          Réglez via Wave puis collez votre identifiant de transaction
          ci-dessous pour finaliser.
        </p>

        <div className="my-8">
          <WaveCheckout
            reference={booking.reference}
            amount={booking.totalXof}
            breakdown={{
              subtotal: booking.subtotalXof,
              vat: booking.vatXof,
              cityTax: booking.cityTaxXof,
              nights: booking.nights,
            }}
            alreadySubmitted={alreadySubmitted}
            waveNumber={
              process.env.NEXT_PUBLIC_WAVE_NUMBER || "+225 07 00 00 00 00"
            }
            merchantName={
              process.env.NEXT_PUBLIC_WAVE_MERCHANT_NAME ||
              "BAHIA HOTEL — ASSINIE"
            }
            qrUrl={process.env.NEXT_PUBLIC_WAVE_QR_URL || null}
            waveLink={process.env.NEXT_PUBLIC_WAVE_LINK || null}
          />
        </div>
      </div>
    </main>
  );
}
