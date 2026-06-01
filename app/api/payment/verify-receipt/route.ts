import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { prisma } from "@/lib/db";
import { getWaveSettings } from "@/lib/settings";
import {
  extractReceiptFields,
  computeReceiptVerdict,
} from "@/lib/ai/receipt-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
  contentType: z.string().min(1),
  bookingReference: z.string().regex(/^BHA-\d{6}-[A-Z0-9]{6}$/),
});

/**
 * Reads an uploaded Wave receipt with the vision model, computes a
 * green/orange/red verdict against the booking's expected amount + the hotel's
 * Wave number, and persists it to the Payment row so staff see it during their
 * manual verification. The verdict NEVER changes the booking status on its own.
 * On any failure we return HTTP 200 with `ok:false` so the chat degrades to a
 * manual-only flow.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp();
  const limit = await checkRateLimit("receipt-verify", ip, 10, "10 m");
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Paramètres manquants" },
      { status: 400 }
    );
  }

  const { url, key, contentType, bookingReference } = parsed.data;

  // Only ever read files we produced under the private scans prefix.
  if (!key.startsWith("id-scans/")) {
    return NextResponse.json(
      { ok: false, error: "Clé invalide" },
      { status: 400 }
    );
  }

  // Vision OCR is image-only; PDFs are stored but not read automatically.
  if (contentType === "application/pdf") {
    return NextResponse.json({ ok: false, skipped: true });
  }

  const booking = await prisma.booking.findUnique({
    where: { reference: bookingReference },
    include: { payment: true },
  });
  if (!booking || !booking.payment) {
    return NextResponse.json(
      { ok: false, error: "Réservation introuvable." },
      { status: 404 }
    );
  }
  if (booking.status === "CONFIRMED" || booking.status === "CANCELLED") {
    return NextResponse.json({
      ok: false,
      error: "Cette réservation ne peut plus être modifiée.",
    });
  }

  try {
    const wave = await getWaveSettings();
    const extraction = await extractReceiptFields({ url, key, contentType });
    const check = computeReceiptVerdict(extraction, {
      amountXof: booking.totalXof,
      waveNumber: wave.number,
    });

    const note = check.reasons.join(" ").slice(0, 1000);

    await prisma.payment.update({
      where: { id: booking.payment.id },
      data: {
        receiptUrl: url,
        receiptKey: key,
        receiptVerdict: check.verdict,
        receiptNote: note,
        receiptAmountXof: check.amountReceivedXof,
        receiptSender: check.senderName,
        receiptCheckedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      verdict: check.verdict,
      reasons: check.reasons,
      transactionId: check.transactionId,
      amountReceivedXof: check.amountReceivedXof,
    });
  } catch (e) {
    console.error("[receipt-verify]", e);
    return NextResponse.json({
      ok: false,
      error: "Lecture automatique indisponible",
    });
  }
}
