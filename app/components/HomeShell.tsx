"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Accommodations from "./Accommodations";
import Karaoke from "./Karaoke";
import Experience from "./Experience";
import Footer from "./Footer";
import BookingModal from "./BookingModal";
import IyaChat from "./IyaChat";
import type { SerializedRoom } from "@/types";

type Props = { rooms: SerializedRoom[] };

export type BookingPrefill = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

export default function HomeShell({ rooms }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselected, setPreselected] = useState<SerializedRoom | null>(null);
  const [prefill, setPrefill] = useState<BookingPrefill>({});

  const open = (
    room: SerializedRoom | null = null,
    prefillData: BookingPrefill = {}
  ) => {
    setPreselected(room);
    setPrefill(prefillData);
    setBookingOpen(true);
  };

  // Handle deep links from Iya (?openBooking=1&room=...&checkIn=...&checkOut=...&guests=...)
  useEffect(() => {
    if (searchParams.get("openBooking") !== "1") return;

    const roomId = searchParams.get("room");
    const checkIn = searchParams.get("checkIn") ?? undefined;
    const checkOut = searchParams.get("checkOut") ?? undefined;
    const guestsParam = searchParams.get("guests");
    const guests = guestsParam ? parseInt(guestsParam, 10) : undefined;

    const room = roomId ? rooms.find((r) => r.id === roomId) ?? null : null;
    open(room, { checkIn, checkOut, guests });

    // Strip the query string so a refresh doesn't reopen the modal
    const url = new URL(window.location.href);
    [
      "openBooking",
      "room",
      "checkIn",
      "checkOut",
      "guests",
    ].forEach((k) => url.searchParams.delete(k));
    router.replace(url.pathname + (url.hash || ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rooms]);

  return (
    <>
      <Navbar onBook={() => open()} />
      <Hero onBook={() => open()} />
      <Accommodations rooms={rooms} onBook={(r) => open(r)} />
      <Karaoke />
      <Experience />
      <Footer />
      <BookingModal
        open={bookingOpen}
        rooms={rooms}
        preselected={preselected}
        prefill={prefill}
        onClose={() => setBookingOpen(false)}
      />
      <IyaChat />
    </>
  );
}
