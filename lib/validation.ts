import { z } from "zod";

// --------------------------------------------------------------------------
// Shared primitives
// --------------------------------------------------------------------------

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9 ]{8,20}$/, "Numéro de téléphone invalide");

export const emailSchema = z.string().trim().email("Email invalide").toLowerCase();

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)");

// --------------------------------------------------------------------------
// Booking
// --------------------------------------------------------------------------

export const idTypeSchema = z.enum([
  "CNI",
  "PASSPORT",
  "CONSULAR_CARD",
  "RESIDENCE_PERMIT",
]);
export type IdTypeInput = z.infer<typeof idTypeSchema>;

/** ID document types that legally require both sides scanned. */
export const ID_TYPES_REQUIRING_BACK: IdTypeInput[] = ["CNI", "RESIDENCE_PERMIT"];

export const bookingInputSchema = z
  .object({
    roomId: z.string().min(1, "Hébergement requis"),
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.coerce.number().int().min(1, "Au moins 1 voyageur").max(12),
    fullName: z.string().trim().min(2, "Nom complet requis").max(120),
    email: emailSchema,
    phone: phoneSchema,
    nationality: z.string().trim().min(2).max(60),
    idType: idTypeSchema,
    idNumber: z
      .string()
      .trim()
      .min(4, "Numéro de pièce trop court")
      .max(40, "Numéro de pièce trop long"),
    idImageUrl: z
      .string()
      .trim()
      .min(1, "Téléversement du recto requis")
      .refine(
        (v) => /^https?:\/\//.test(v) || v.startsWith("/") || v.startsWith("local:"),
        "Référence de téléversement invalide"
      ),
    idImageKey: z.string().optional(),
    idImageBackUrl: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (v) =>
          v == null ||
          v === "" ||
          /^https?:\/\//.test(v) ||
          v.startsWith("/") ||
          v.startsWith("local:"),
        "Référence de téléversement invalide"
      ),
    idImageBackKey: z.string().optional().nullable(),
    rgpdAccepted: z.literal(true, {
      errorMap: () => ({
        message: "Vous devez accepter le traitement légal des données.",
      }),
    }),
  })
  .superRefine((v, ctx) => {
    const a = new Date(v.checkIn);
    const b = new Date(v.checkOut);
    if (b <= a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkOut"],
        message: "La date de départ doit suivre l'arrivée.",
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (a < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkIn"],
        message: "La date d'arrivée ne peut pas être dans le passé.",
      });
    }
    if (
      ID_TYPES_REQUIRING_BACK.includes(v.idType) &&
      !v.idImageBackUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idImageBackUrl"],
        message:
          "Le verso est obligatoire pour la CNI et la carte de séjour.",
      });
    }
  });

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const waveReferenceSchema = z.object({
  bookingReference: z
    .string()
    .trim()
    .regex(/^BHA-\d{6}-[A-Z0-9]{6}$/, "Référence de réservation invalide"),
  waveReference: z
    .string()
    .trim()
    .min(4, "Référence Wave trop courte")
    .max(60, "Référence Wave trop longue"),
});

export type WaveReferenceInput = z.infer<typeof waveReferenceSchema>;

// --------------------------------------------------------------------------
// Karaoke
// --------------------------------------------------------------------------

export const karaokeInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal("")),
  date: isoDateSchema,
  partySize: z.coerce.number().int().min(1).max(20),
  notes: z.string().max(500).optional(),
});

export type KaraokeInput = z.infer<typeof karaokeInputSchema>;

// --------------------------------------------------------------------------
// Upload
// --------------------------------------------------------------------------

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const maxUploadBytes = 8 * 1024 * 1024; // 8 MB
