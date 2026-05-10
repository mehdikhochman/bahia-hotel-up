import type { Room, RoomType } from "@prisma/client";

export type SerializedRoom = Omit<Room, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type { Room, RoomType };

export const navLinks = [
  { href: "#accueil", label: "Accueil" },
  { href: "#hebergements", label: "Hébergements" },
  { href: "#karaoke", label: "Karaoké" },
  { href: "#experience", label: "Expérience" },
  { href: "#contact", label: "Contact" },
] as const;
