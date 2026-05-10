"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendBookingConfirmed, sendBookingRejected } from "@/lib/email";
import { sendSms, bookingConfirmedSms } from "@/lib/sms";
import { formatDate } from "@/lib/format";

const idSchema = z.object({ bookingId: z.string().min(1) });
const rejectSchema = idSchema.extend({
  reason: z.string().trim().min(2, "Motif requis").max(300),
});

/** Mark Wave payment as VERIFIED and booking as CONFIRMED. */
export async function confirmBookingAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = idSchema.safeParse({ bookingId: formData.get("bookingId") });
  if (!parsed.success) return;

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { payment: true, user: true, room: true },
  });
  if (!booking || !booking.payment) return;
  if (booking.status === "CONFIRMED" || booking.status === "CANCELLED") return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `[audit] ${session.email} confirmed booking ${booking.reference}`
  );

  await sendBookingConfirmed(booking).catch((e) =>
    console.error("[email] confirm failed", e)
  );

  sendSms(
    booking.user.phone,
    bookingConfirmedSms({
      fullName: booking.user.fullName,
      reference: booking.reference,
      checkInLabel: formatDate(booking.checkIn),
    })
  ).catch((e) => console.error("[sms] confirm failed", e));

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${booking.id}`);
}

export async function rejectBookingAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = rejectSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { payment: true, user: true, room: true },
  });
  if (!booking || !booking.payment) return;
  if (booking.status === "CANCELLED") return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectReason: parsed.data.reason,
      },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `[audit] ${session.email} rejected booking ${booking.reference}: ${parsed.data.reason}`
  );

  await sendBookingRejected(booking, parsed.data.reason).catch((e) =>
    console.error("[email] reject failed", e)
  );

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${booking.id}`);
}

const karaokeIdSchema = z.object({
  reservationId: z.string().min(1),
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export async function updateKaraokeStatusAction(formData: FormData) {
  await requireAdmin();
  const parsed = karaokeIdSchema.safeParse({
    reservationId: formData.get("reservationId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await prisma.karaokeReservation.update({
    where: { id: parsed.data.reservationId },
    data: { status: parsed.data.status },
  });
  revalidatePath("/admin/karaoke");
}
