import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileText,
  Mail,
  Phone,
  MapPin,
  CalendarRange,
  BedDouble,
  Users,
  Hash,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXOF } from "@/lib/utils";
import { formatDate, formatDateTime, statusLabel, statusTone } from "@/lib/format";
import { confirmBookingAction, rejectBookingAction } from "../../actions";

const ID_TYPE_LABEL: Record<string, string> = {
  CNI: "CNI",
  PASSPORT: "Passeport",
  CONSULAR_CARD: "Carte consulaire",
};

export default async function BookingDetail({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      room: true,
      payment: true,
      identification: true,
    },
  });
  if (!booking) notFound();

  const canConfirm =
    booking.status === "PENDING_PAYMENT" ||
    booking.status === "AWAITING_VERIFICATION";
  const canReject = booking.status !== "CANCELLED";

  return (
    <div>
      <Link
        href="/admin/bookings"
        className="text-teal-500 text-sm flex items-center gap-1.5 mb-4 hover:text-teal-700"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux réservations
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <div className="text-teal-500 text-xs uppercase tracking-widest mb-1">
            Réservation
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-teal-700 font-mono">
            {booking.reference}
          </h1>
          <div className="text-teal-500 text-xs mt-1">
            Créée {formatDateTime(booking.createdAt)}
          </div>
        </div>
        <span
          className={`self-start md:self-auto px-3 py-1.5 rounded-full border text-xs ${
            statusTone[booking.status]
          }`}
        >
          {statusLabel[booking.status]}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 space-y-5">
          <Card title="Séjour" icon={CalendarRange}>
            <Row icon={BedDouble} label="Hébergement" value={`${booking.room.type === "VILLA" ? "Villa" : "Chambre"} ${booking.room.name}`} />
            <Row label="Arrivée" value={formatDate(booking.checkIn)} />
            <Row label="Départ" value={formatDate(booking.checkOut)} />
            <Row label="Nuits" value={booking.nights} />
            <Row icon={Users} label="Voyageurs" value={booking.guests} />
            <div className="border-t border-teal-100 mt-2 pt-2">
              <Row label="Sous-total" value={formatXOF(booking.subtotalXof)} />
              <Row label="TVA 18 %" value={formatXOF(booking.vatXof)} />
              <Row label="Taxe de séjour" value={formatXOF(booking.cityTaxXof)} />
              <Row
                label="Total"
                value={
                  <span className="font-display text-teal-700 text-lg">
                    {formatXOF(booking.totalXof)}
                  </span>
                }
              />
            </div>
          </Card>

          <Card title="Voyageur" icon={Mail}>
            <Row label="Nom" value={booking.user.fullName} />
            <Row icon={Mail} label="Email" value={booking.user.email} />
            <Row icon={Phone} label="Téléphone" value={booking.user.phone} />
            <Row icon={MapPin} label="Nationalité" value={booking.user.nationality ?? "—"} />
          </Card>

          <Card title="Pièce d'identité (KYC)" icon={ShieldCheck}>
            {booking.identification ? (
              <>
                <Row label="Nom sur la pièce" value={booking.identification.fullName} />
                <Row
                  icon={FileText}
                  label="Type"
                  value={ID_TYPE_LABEL[booking.identification.idType]}
                />
                <Row icon={Hash} label="Numéro" value={booking.identification.idNumber} />
                <Row
                  label="RGPD"
                  value={
                    booking.identification.rgpdAccepted
                      ? `Accepté ${booking.identification.acceptedAt ? `· ${formatDateTime(booking.identification.acceptedAt)}` : ""}`
                      : "Refusé"
                  }
                />
                <div className="mt-3 pt-3 border-t border-teal-100">
                  <a
                    href={`/admin/api/scan/${booking.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-ivory-100 text-sm"
                  >
                    <FileText className="w-4 h-4" /> Voir la pièce
                  </a>
                  <span className="ml-3 text-teal-500 text-xs">
                    Accès journalisé
                  </span>
                </div>
              </>
            ) : (
              <p className="text-teal-500 text-sm">Aucune pièce attachée.</p>
            )}
          </Card>
        </section>

        <aside className="space-y-5">
          <Card title="Paiement Wave" icon={CheckCircle2}>
            {booking.payment ? (
              <>
                <Row label="Montant" value={formatXOF(booking.payment.amountXof)} />
                <Row label="Statut" value={booking.payment.status} />
                <Row
                  label="Référence Wave"
                  value={
                    booking.payment.waveReference ? (
                      <span className="font-mono">
                        {booking.payment.waveReference}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                {booking.payment.submittedAt && (
                  <Row
                    label="Soumis le"
                    value={formatDateTime(booking.payment.submittedAt)}
                  />
                )}
                {booking.payment.verifiedAt && (
                  <Row
                    label="Vérifié le"
                    value={formatDateTime(booking.payment.verifiedAt)}
                  />
                )}
                {booking.payment.rejectReason && (
                  <Row
                    label="Motif rejet"
                    value={
                      <span className="text-red-600 text-xs">
                        {booking.payment.rejectReason}
                      </span>
                    }
                  />
                )}
              </>
            ) : (
              <p className="text-teal-500 text-sm">Aucun paiement.</p>
            )}
          </Card>

          {(canConfirm || canReject) && (
            <Card title="Actions">
              {canConfirm && (
                <form action={confirmBookingAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button
                    type="submit"
                    className="w-full px-4 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmer le paiement
                  </button>
                  <p className="text-teal-500 text-xs mt-2 text-center">
                    Passe la réservation à <strong>Confirmée</strong> et notifie
                    le voyageur.
                  </p>
                </form>
              )}

              {canReject && (
                <form action={rejectBookingAction} className="mt-4 pt-4 border-t border-teal-100">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <label className="block">
                    <div className="text-teal-700 text-sm font-medium mb-1.5">
                      Annuler la réservation
                    </div>
                    <textarea
                      required
                      name="reason"
                      placeholder="Motif (ex. paiement Wave introuvable)"
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-teal-100 bg-white text-teal-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full mt-3 px-4 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler & notifier
                  </button>
                </form>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-teal-100 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4 text-teal-700">
        {Icon && <Icon className="w-4 h-4 text-sand-600" />}
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: typeof Mail;
}) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-teal-500 flex items-center gap-1.5 shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="text-teal-700 font-medium text-right break-all">
        {value}
      </span>
    </div>
  );
}
