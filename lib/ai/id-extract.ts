import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { getVisionModel } from "./client";
import { readIdScanLocal } from "@/lib/storage";

/**
 * Structured result of reading an uploaded identity document with a vision
 * model. Every field is nullable: the model must not invent values it cannot
 * read. `isIdDocument` / `legible` drive the anti-fraud / anti-blur UX, and
 * extracted fields pre-fill the booking form (always kept editable by the
 * guest — we never persist anything until they confirm).
 */
export const idExtractionSchema = z.object({
  isIdDocument: z
    .boolean()
    .describe(
      "True only if the image is a government identity document (national ID card, passport, residence permit, consular card). False for selfies, random photos, blank pages, screenshots of text, etc."
    ),
  legible: z
    .boolean()
    .describe(
      "True if the document is sharp, well-lit and the key fields can be read confidently. False if blurry, glare-obscured, cropped or too dark."
    ),
  idType: z
    .enum(["CNI", "PASSPORT", "RESIDENCE_PERMIT", "CONSULAR_CARD"])
    .nullable()
    .describe(
      "Detected document type, or null if undetermined. CNI = national identity card."
    ),
  idNumber: z
    .string()
    .nullable()
    .describe("Document/serial number exactly as printed, or null."),
  fullName: z
    .string()
    .nullable()
    .describe("Full name as printed (given + family), or null."),
  nationality: z
    .string()
    .nullable()
    .describe("Nationality as printed (country name), or null."),
  expiryDate: z
    .string()
    .nullable()
    .describe("Expiry date in ISO YYYY-MM-DD if readable, otherwise null."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Overall confidence in the extracted fields."),
  concerns: z
    .array(z.string())
    .describe(
      "Short human-readable flags (e.g. 'image floue', 'document expiré', 'numéro partiellement masqué'). Empty array if none."
    ),
});

export type IdExtraction = z.infer<typeof idExtractionSchema>;

type ExtractArgs = {
  url: string;
  key: string;
  contentType: string;
};

/**
 * Reads an uploaded ID scan with the vision model and returns structured
 * fields. Resolves the image either from a public Blob URL (production) or from
 * the local-dev `local:` sentinel (bytes read off disk and inlined as a data
 * URL). Throws on provider/credential errors — callers handle graceful
 * fallback to manual entry.
 */
export async function extractIdFields({
  url,
  key,
  contentType,
}: ExtractArgs): Promise<IdExtraction> {
  let image: URL | string;

  if (url.startsWith("local:")) {
    const bytes = await readIdScanLocal(key);
    const base64 = bytes.toString("base64");
    image = `data:${contentType || "image/jpeg"};base64,${base64}`;
  } else {
    image = new URL(url);
  }

  const { object } = await generateObject({
    model: getVisionModel(),
    schema: idExtractionSchema,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Tu es un agent de lecture de pièces d'identité pour l'enregistrement légal des voyageurs d'un hôtel en Côte d'Ivoire. Tu lis UNIQUEMENT ce qui est visible sur le document. N'invente jamais une valeur : si un champ n'est pas lisible, renvoie null. Sois strict sur isIdDocument et legible — ils servent à détecter les fraudes et les photos floues.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Lis cette pièce d'identité et extrais les champs structurés.",
          },
          { type: "image", image },
        ],
      },
    ],
  });

  return object;
}
