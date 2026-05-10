"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { karaokeInputSchema } from "@/lib/validation";
import { generateBookingReference, isSaturday } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import type { ActionResult } from "./booking";

export async function createKaraokeReservation(
  raw: unknown
): Promise<ActionResult<{ reference: string }>> {
  const ip = getClientIp();
  const limit = await checkRateLimit("karaoke:create", ip, 3, "10 m");
  if (!limit.ok) {
    return {
      ok: false,
      error: "Trop de tentatives. Réessayez dans quelques minutes.",
    };
  }

  const parsed = karaokeInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      error: "Vérifiez les champs.",
      fieldErrors,
    };
  }

  const date = new Date(parsed.data.date);
  if (!isSaturday(date)) {
    return {
      ok: false,
      error: "La soirée karaoké a lieu uniquement le samedi.",
      fieldErrors: { date: "Choisissez un samedi" },
    };
  }

  const reference = generateBookingReference("KRK");

  const reservation = await prisma.karaokeReservation.create({
    data: {
      reference,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      date,
      partySize: parsed.data.partySize,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/");
  return { ok: true, data: { reference: reservation.reference } };
}
