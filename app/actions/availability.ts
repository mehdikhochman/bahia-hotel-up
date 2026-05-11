"use server";

import { prisma } from "@/lib/db";

export type AvailabilityData = {
  totalUnits: number;
  /** ISO `YYYY-MM-DD` → count of concurrent bookings on that night. */
  byDate: Record<string, number>;
};

/**
 * Returns availability for a room over the next `monthsAhead` months.
 *
 * A date is "fully booked" when `byDate[date] >= totalUnits`. The client
 * calendar uses this rule to decide whether to disable a cell.
 */
export async function getRoomAvailability(
  roomId: string,
  monthsAhead = 6
): Promise<AvailabilityData> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCMonth(horizon.getUTCMonth() + monthsAhead);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { totalUnits: true },
  });
  if (!room) return { totalUnits: 1, byDate: {} };

  const bookings = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: ["PENDING_PAYMENT", "AWAITING_VERIFICATION", "CONFIRMED"] },
      checkOut: { gt: today },
      checkIn: { lt: horizon },
    },
    select: { checkIn: true, checkOut: true },
  });

  const byDate: Record<string, number> = {};
  for (const b of bookings) {
    const cur = new Date(b.checkIn);
    cur.setUTCHours(0, 0, 0, 0);
    const end = new Date(b.checkOut);
    end.setUTCHours(0, 0, 0, 0);
    while (cur < end) {
      const k = cur.toISOString().split("T")[0];
      byDate[k] = (byDate[k] ?? 0) + 1;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  return { totalUnits: room.totalUnits, byDate };
}
