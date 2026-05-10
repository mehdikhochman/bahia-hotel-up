import { format as fmt } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return fmt(date, "dd MMM yyyy", { locale: fr });
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return fmt(date, "dd MMM yyyy · HH:mm", { locale: fr });
}

export const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  AWAITING_VERIFICATION: "À vérifier",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};

export const statusTone: Record<string, string> = {
  PENDING_PAYMENT: "bg-sand-100 text-sand-700 border-sand-200",
  AWAITING_VERIFICATION: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};
