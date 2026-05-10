"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Accommodations from "./Accommodations";
import Karaoke from "./Karaoke";
import Experience from "./Experience";
import Footer from "./Footer";
import BookingModal from "./BookingModal";
import type { SerializedRoom } from "@/types";

type Props = { rooms: SerializedRoom[] };

export default function HomeShell({ rooms }: Props) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselected, setPreselected] = useState<SerializedRoom | null>(null);

  const open = (room: SerializedRoom | null = null) => {
    setPreselected(room);
    setBookingOpen(true);
  };

  return (
    <>
      <Navbar onBook={() => open()} />
      <Hero onBook={() => open()} />
      <Accommodations rooms={rooms} onBook={open} />
      <Karaoke />
      <Experience />
      <Footer />
      <BookingModal
        open={bookingOpen}
        rooms={rooms}
        preselected={preselected}
        onClose={() => setBookingOpen(false)}
      />
    </>
  );
}
