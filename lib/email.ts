import "server-only";

import { Resend } from "resend";
import type { Booking, Payment, Room, User } from "@prisma/client";
import { formatXOF } from "./utils";
import { formatDate } from "./format";

type FullBooking = Booking & {
  user: User;
  room: Room;
  payment: Payment | null;
};

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const FROM = process.env.EMAIL_FROM || "Bahia <onboarding@resend.dev>";
const STAFF_INBOX = process.env.STAFF_EMAIL || "";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://bahia-assinie.ci";

async function deliver(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.log(
      `[email/dev] (RESEND_API_KEY missing) would send "${opts.subject}" → ${opts.to}`
    );
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    reply_to: opts.replyTo,
  });
}

// --------------------------------------------------------------------------
// Templates (inlined CSS — email clients hate <style>)
// --------------------------------------------------------------------------

function wrap(title: string, body: string) {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#FDF5E6;font-family:Helvetica,Arial,sans-serif;color:#00445C;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:18px;border:1px solid #E6F2F6;overflow:hidden;">
          <tr><td style="background:#00688B;padding:22px 28px;color:#FDF5E6;">
            <div style="font-size:22px;font-family:Georgia,serif;letter-spacing:.5px;">Bahia · Assinie Terminal</div>
            <div style="font-size:12px;opacity:.75;margin-top:4px;">${title}</div>
          </td></tr>
          <tr><td style="padding:24px 28px;line-height:1.55;font-size:15px;">${body}</td></tr>
          <tr><td style="padding:14px 28px;background:#FDF5E6;border-top:1px solid #E6F2F6;font-size:12px;color:#005775;">
            Réception 24/7 · +225 07 00 00 00 00 · reservations@bahia-assinie.ci
          </td></tr>
        </table>
        <div style="font-size:11px;color:#7E6831;margin-top:14px;">Bahia Hotel — Assinie Terminal, Côte d'Ivoire</div>
      </td></tr>
    </table>
  </body>
</html>`;
}

function bookingTable(b: FullBooking) {
  const row = (k: string, v: string, opts: { strong?: boolean; muted?: boolean } = {}) =>
    `<tr><td style="padding:5px 0;color:${
      opts.muted ? "#7E6831" : "#005775"
    };font-size:13px;">${k}</td><td style="padding:5px 0;text-align:right;color:${
      opts.muted ? "#7E6831" : "#00445C"
    };font-weight:${opts.strong ? 700 : 600};font-size:13px;">${v}</td></tr>`;
  return `<table role="presentation" width="100%" style="margin:14px 0 8px;border-top:1px solid #E6F2F6;border-bottom:1px solid #E6F2F6;">
    ${row("Référence", `<span style="font-family:monospace;">${b.reference}</span>`)}
    ${row("Hébergement", `${b.room.type === "VILLA" ? "Villa" : "Chambre"} ${b.room.name}`)}
    ${row("Arrivée", formatDate(b.checkIn))}
    ${row("Départ", formatDate(b.checkOut))}
    ${row("Nuits", String(b.nights))}
    ${row("Voyageurs", String(b.guests))}
    ${row(`Sous-total (${b.nights} nuit${b.nights > 1 ? "s" : ""})`, formatXOF(b.subtotalXof), { muted: true })}
    ${row("TVA 18 %", formatXOF(b.vatXof), { muted: true })}
    ${row("Taxe de séjour", formatXOF(b.cityTaxXof), { muted: true })}
    ${row("Total", `<span style="color:#00688B;font-size:15px;">${formatXOF(b.totalXof)}</span>`, { strong: true })}
  </table>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#C9A96E;color:#003244;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px;">${label}</a>`;

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/** Sent right after a booking is created — directs guest to Wave checkout. */
export async function sendBookingCreated(b: FullBooking) {
  const checkout = `${SITE_URL}/checkout/${b.reference}`;
  const guestBody = `
    <p>Bonjour ${escapeHtml(b.user.fullName.split(" ")[0] || "")},</p>
    <p>Merci d'avoir choisi Bahia. Votre réservation est créée et n'attend plus que votre paiement <strong>Wave</strong>.</p>
    ${bookingTable(b)}
    <p style="margin:20px 0;">${button(checkout, "Payer via Wave")}</p>
    <p style="font-size:13px;color:#005775;">Votre place est garantie 30 minutes après confirmation du paiement. À très vite à Assinie.</p>
  `;
  await deliver({
    to: b.user.email,
    subject: `Bahia — Réservation ${b.reference} reçue`,
    html: wrap("Confirmation de réservation", guestBody),
  });

  if (STAFF_INBOX) {
    const staffBody = `
      <p><strong>Nouvelle réservation</strong> en attente de paiement Wave.</p>
      ${bookingTable(b)}
      <p>Voyageur : ${escapeHtml(b.user.fullName)} · ${escapeHtml(b.user.email)} · ${escapeHtml(b.user.phone)}</p>
      <p>${button(`${SITE_URL}/admin/bookings/${b.id}`, "Ouvrir dans le staff")}</p>
    `;
    await deliver({
      to: STAFF_INBOX,
      subject: `[Bahia] Nouvelle réservation ${b.reference}`,
      html: wrap("Nouvelle réservation", staffBody),
      replyTo: b.user.email,
    });
  }
}

/** Sent when guest submits their Wave transaction reference. */
export async function sendWaveReferenceSubmitted(b: FullBooking) {
  const guestBody = `
    <p>Bonjour ${escapeHtml(b.user.fullName.split(" ")[0] || "")},</p>
    <p>Nous avons reçu votre référence de paiement Wave. Notre équipe la rapproche en interne — vous recevrez la confirmation finale sous 30 minutes.</p>
    ${bookingTable(b)}
    <p style="font-size:13px;color:#005775;">En cas de question : reservations@bahia-assinie.ci</p>
  `;
  await deliver({
    to: b.user.email,
    subject: `Bahia — Paiement reçu (${b.reference})`,
    html: wrap("Paiement en vérification", guestBody),
  });

  if (STAFF_INBOX) {
    const staffBody = `
      <p><strong>Paiement Wave à vérifier</strong></p>
      <p>Référence Wave soumise par le voyageur : <code style="background:#E6F2F6;padding:2px 8px;border-radius:4px;">${escapeHtml(
        b.payment?.waveReference || "—"
      )}</code></p>
      ${bookingTable(b)}
      <p>${button(`${SITE_URL}/admin/bookings/${b.id}`, "Vérifier maintenant")}</p>
    `;
    await deliver({
      to: STAFF_INBOX,
      subject: `[Bahia] ⚠ Paiement à vérifier — ${b.reference}`,
      html: wrap("Paiement à vérifier", staffBody),
    });
  }
}

/** Sent when staff confirms the booking. */
export async function sendBookingConfirmed(b: FullBooking) {
  const guestBody = `
    <p>Bonjour ${escapeHtml(b.user.fullName.split(" ")[0] || "")},</p>
    <p>Votre séjour est <strong>confirmé</strong> ! Nous avons hâte de vous accueillir à Assinie.</p>
    ${bookingTable(b)}
    <p style="font-size:13px;color:#005775;"><strong>Check-in</strong> à partir de 14h, réception 24/7. Une voiture peut être organisée depuis Abidjan sur demande — répondez simplement à cet email.</p>
    <p style="font-size:13px;color:#005775;">Pensez à vous munir de la pièce d'identité scannée lors de la réservation.</p>
  `;
  await deliver({
    to: b.user.email,
    subject: `Bahia — Séjour confirmé ✓ (${b.reference})`,
    html: wrap("Séjour confirmé", guestBody),
  });
}

/** Sent when staff rejects / cancels. */
export async function sendBookingRejected(b: FullBooking, reason: string) {
  const guestBody = `
    <p>Bonjour ${escapeHtml(b.user.fullName.split(" ")[0] || "")},</p>
    <p>Nous sommes désolés, mais votre réservation <strong>${escapeHtml(
      b.reference
    )}</strong> n'a pas pu être confirmée.</p>
    <p style="background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;padding:12px;border-radius:10px;font-size:13px;">
      <strong>Motif :</strong> ${escapeHtml(reason)}
    </p>
    <p>Si vous pensez qu'il s'agit d'une erreur, contactez-nous directement :</p>
    <p style="font-size:13px;color:#005775;">reservations@bahia-assinie.ci · +225 07 00 00 00 00</p>
  `;
  await deliver({
    to: b.user.email,
    subject: `Bahia — Réservation ${b.reference} non confirmée`,
    html: wrap("Réservation non confirmée", guestBody),
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
