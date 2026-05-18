"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { SerializedRoom } from "@/types";

export type BookingPrefill = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

type Props = {
  rooms: SerializedRoom[];
  onOpen: (room: SerializedRoom | null, prefill: BookingPrefill) => void;
};

/**
 * Reads `?openBooking=1&room=...&checkIn=...&checkOut=...&guests=...` from
 * the URL (typically set by the Iya chat deep links) and triggers the
 * booking modal with everything prefilled.
 *
 * Isolated in its own client component so HomeShell can prerender — the
 * Suspense boundary in HomeShell hides this from Next's static generator.
 */
export default function BookingDeepLink({ rooms, onOpen }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("openBooking") !== "1") return;

    const roomId = searchParams.get("room");
    const checkIn = searchParams.get("checkIn") ?? undefined;
    const checkOut = searchParams.get("checkOut") ?? undefined;
    const guestsParam = searchParams.get("guests");
    const guests = guestsParam ? parseInt(guestsParam, 10) : undefined;

    const room = roomId ? rooms.find((r) => r.id === roomId) ?? null : null;
    onOpen(room, { checkIn, checkOut, guests });

    // Strip the params so a refresh doesn't re-open the modal
    const url = new URL(window.location.href);
    ["openBooking", "room", "checkIn", "checkOut", "guests"].forEach((k) =>
      url.searchParams.delete(k)
    );
    router.replace(url.pathname + (url.hash || ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rooms]);

  return null;
}
