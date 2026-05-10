"use server";

import { prisma } from "@/lib/db";

export type BookedRange = { start: string; end: string };

/**
 * Returns confirmed/pending date ranges for a room over the next `monthsAhead`
 * months. Half-open intervals: [start, end). Strings are ISO `YYYY-MM-DD`.
 */
export async function getRoomAvailability(
  roomId: string,
  monthsAhead = 6
): Promise<BookedRange[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCMonth(horizon.getUTCMonth() + monthsAhead);

  const bookings = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: ["PENDING_PAYMENT", "AWAITING_VERIFICATION", "CONFIRMED"] },
      checkOut: { gt: today },
      checkIn: { lt: horizon },
    },
    select: { checkIn: true, checkOut: true },
  });

  return bookings.map((b) => ({
    start: b.checkIn.toISOString().split("T")[0],
    end: b.checkOut.toISOString().split("T")[0],
  }));
}
