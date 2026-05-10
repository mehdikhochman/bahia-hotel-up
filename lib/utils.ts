import { randomBytes } from "crypto";

export const formatXOF = (n: number) =>
  new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Generates a human-friendly booking reference.
 * Format: BHA-YYMMDD-XXXXXX  (e.g. BHA-260510-4F7K2D)
 */
export function generateBookingReference(prefix: "BHA" | "KRK" = "BHA") {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const rand = randomBytes(4)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, "X");
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

export function differenceInNights(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function isSaturday(d: Date) {
  return d.getUTCDay() === 6;
}

/** Returns the date of the next Saturday at 20:00 UTC. */
export function nextSaturday(from: Date = new Date()) {
  const d = new Date(from);
  const day = d.getUTCDay();
  const delta = (6 - day + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + delta);
  d.setUTCHours(20, 0, 0, 0);
  return d;
}
