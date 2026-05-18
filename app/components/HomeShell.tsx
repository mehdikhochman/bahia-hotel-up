"use client";

import { Suspense, useState } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Accommodations from "./Accommodations";
import Karaoke from "./Karaoke";
import Experience from "./Experience";
import Footer from "./Footer";
import BookingModal from "./BookingModal";
import IyaChat from "./IyaChat";
import BookingDeepLink, { type BookingPrefill } from "./BookingDeepLink";
import type { SerializedRoom } from "@/types";

type Props = { rooms: SerializedRoom[] };

export default function HomeShell({ rooms }: Props) {
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

      {/* Reads URL params (?openBooking=1&room=...) from Iya deep links.
          Isolated in Suspense so useSearchParams doesn't bail the page
          out of static prerendering. */}
      <Suspense fallback={null}>
        <BookingDeepLink rooms={rooms} onOpen={open} />
      </Suspense>
    </>
  );
}
