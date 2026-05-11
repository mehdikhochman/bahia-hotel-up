"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  bookingInputSchema,
  waveReferenceSchema,
  type BookingInput,
  type WaveReferenceInput,
} from "@/lib/validation";
import {
  differenceInNights,
  generateBookingReference,
} from "@/lib/utils";
import { computePricing } from "@/lib/pricing";
import { sendBookingCreated, sendWaveReferenceSubmitted } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createBooking(
  raw: unknown
): Promise<
  ActionResult<{
    bookingId: string;
    reference: string;
    totalXof: number;
    checkoutUrl: string;
  }>
> {
  const ip = getClientIp();
  const limit = await checkRateLimit("booking:create", ip, 5, "10 m");
  if (!limit.ok) {
    return {
      ok: false,
      error: "Trop de tentatives. Réessayez dans quelques minutes.",
    };
  }

  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      error: "Validation échouée. Vérifiez les champs.",
      fieldErrors,
    };
  }

  const input: BookingInput = parsed.data;

  const room = await prisma.room.findUnique({
    where: { id: input.roomId },
  });
  if (!room || !room.isActive) {
    return { ok: false, error: "Hébergement introuvable ou indisponible." };
  }

  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);
  const nights = differenceInNights(checkIn, checkOut);
  if (nights <= 0) {
    return { ok: false, error: "Durée de séjour invalide." };
  }

  // Capacity check
  if (input.guests > room.capacity) {
    return {
      ok: false,
      error: `${room.name} accueille jusqu'à ${room.capacity} voyageurs.`,
    };
  }

  // Capacity-aware conflict detection — a Room category may have N identical
  // physical units (totalUnits). We block only if every night in the
  // requested range already has totalUnits concurrent bookings.
  const overlapping = await prisma.booking.findMany({
    where: {
      roomId: room.id,
      status: { in: ["PENDING_PAYMENT", "AWAITING_VERIFICATION", "CONFIRMED"] },
      AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
    },
    select: { checkIn: true, checkOut: true },
  });
  const DAY_MS = 86_400_000;
  for (let t = checkIn.getTime(); t < checkOut.getTime(); t += DAY_MS) {
    const day = new Date(t);
    const dayLoad = overlapping.filter(
      (b) => b.checkIn <= day && b.checkOut > day
    ).length;
    if (dayLoad >= room.totalUnits) {
      return {
        ok: false,
        error: `Plus aucune unité disponible le ${day
          .toISOString()
          .split("T")[0]} pour ${room.name}.`,
      };
    }
  }

  const pricing = computePricing({
    pricePerNight: room.pricePerNight,
    nights,
    guests: input.guests,
  });
  const reference = generateBookingReference("BHA");

  const booking = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: input.email },
      update: {
        fullName: input.fullName,
        phone: input.phone,
        nationality: input.nationality,
      },
      create: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        nationality: input.nationality,
      },
    });

    const created = await tx.booking.create({
      data: {
        reference,
        userId: user.id,
        roomId: room.id,
        checkIn,
        checkOut,
        nights,
        guests: input.guests,
        subtotalXof: pricing.subtotal,
        vatXof: pricing.vat,
        cityTaxXof: pricing.cityTax,
        totalXof: pricing.total,
        identification: {
          create: {
            userId: user.id,
            fullName: input.fullName,
            idType: input.idType,
            idNumber: input.idNumber,
            imageUrl: input.idImageUrl,
            imageKey: input.idImageKey,
            imageBackUrl: input.idImageBackUrl || null,
            imageBackKey: input.idImageBackKey || null,
            rgpdAccepted: input.rgpdAccepted,
            acceptedAt: new Date(),
          },
        },
        payment: {
          create: {
            amountXof: pricing.total,
            method: "WAVE",
            status: "PENDING",
          },
        },
      },
    });

    return created;
  });

  // Fire-and-forget: emails should never block booking creation.
  const fullBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { user: true, room: true, payment: true },
  });
  if (fullBooking) {
    sendBookingCreated(fullBooking).catch((e) =>
      console.error("[email] booking created failed:", e)
    );
  }

  revalidatePath("/");

  return {
    ok: true,
    data: {
      bookingId: booking.id,
      reference: booking.reference,
      totalXof: pricing.total,
      checkoutUrl: `/checkout/${booking.reference}`,
    },
  };
}

export async function submitWaveReference(
  raw: unknown
): Promise<ActionResult<{ status: string }>> {
  const ip = getClientIp();
  const limit = await checkRateLimit("wave:submit", ip, 10, "10 m");
  if (!limit.ok) {
    return {
      ok: false,
      error: "Trop de tentatives. Réessayez dans quelques minutes.",
    };
  }

  const parsed = waveReferenceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const input: WaveReferenceInput = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { reference: input.bookingReference },
    include: { payment: true },
  });
  if (!booking || !booking.payment) {
    return { ok: false, error: "Réservation introuvable." };
  }
  if (booking.status === "CONFIRMED" || booking.status === "CANCELLED") {
    return {
      ok: false,
      error: "Cette réservation ne peut plus être modifiée.",
    };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: {
        waveReference: input.waveReference,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "AWAITING_VERIFICATION" },
    }),
  ]);

  const refreshed = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { user: true, room: true, payment: true },
  });
  if (refreshed) {
    sendWaveReferenceSubmitted(refreshed).catch((e) =>
      console.error("[email] wave submitted failed:", e)
    );
  }

  revalidatePath(`/checkout/${input.bookingReference}`);
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return { ok: true, data: { status: "AWAITING_VERIFICATION" } };
}

export async function getBookingByReference(reference: string) {
  return prisma.booking.findUnique({
    where: { reference },
    include: {
      room: true,
      user: true,
      payment: true,
    },
  });
}
