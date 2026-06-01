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
  // Security check: compare what is PRINTED on the document against the values
  // the guest declared (passed in via `claims`). Decide AFTER reading the doc.
  // Tolerate accents, case, given/family-name order and translated forms
  // (e.g. "ivoirien" ≡ "Côte d'Ivoire"). Use "uncertain" when the document
  // field is unreadable/absent — never invent a mismatch from a bad photo.
  nameMatch: z
    .enum(["match", "mismatch", "uncertain"])
    .describe(
      "Does the declared full name match the name printed on the document?"
    ),
  nationalityMatch: z
    .enum(["match", "mismatch", "uncertain"])
    .describe(
      "Is the declared nationality consistent with the document? (mismatch e.g. declared 'ivoirien' but document is a foreign residence permit / shows another nationality)."
    ),
  matchReason: z
    .string()
    .describe(
      "Short French explanation when nameMatch or nationalityMatch is 'mismatch' (cite what is read vs declared). Empty string if everything matches."
    ),
});

export type IdExtraction = z.infer<typeof idExtractionSchema>;

type ExtractArgs = {
  url: string;
  key: string;
  contentType: string;
  /** Values the guest declared, to cross-check against the scanned document. */
  claims?: {
    fullName?: string | null;
    nationality?: string | null;
  };
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
  claims,
}: ExtractArgs): Promise<IdExtraction> {
  let image: URL | string;

  if (url.startsWith("local:")) {
    const bytes = await readIdScanLocal(key);
    const base64 = bytes.toString("base64");
    image = `data:${contentType || "image/jpeg"};base64,${base64}`;
  } else {
    image = new URL(url);
  }

  const declared =
    claims && (claims.fullName || claims.nationality)
      ? `\n\nLe voyageur a déclaré :\n- Nom complet : ${
          claims.fullName ?? "(non fourni)"
        }\n- Nationalité : ${
          claims.nationality ?? "(non fournie)"
        }\n\nAprès avoir lu le document, compare ces déclarations à ce qui est imprimé et renseigne nameMatch, nationalityMatch et matchReason.`
      : "";

  const { object } = await generateObject({
    model: getVisionModel(),
    schema: idExtractionSchema,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Tu es un agent de sécurité chargé de lire les pièces d'identité pour l'enregistrement légal des voyageurs d'un hôtel en Côte d'Ivoire. Procède en deux temps : (1) lis UNIQUEMENT ce qui est visible sur le document et remplis les champs extraits — n'invente jamais, mets null si illisible ; (2) compare ensuite aux valeurs déclarées par le voyageur. Pour la comparaison, tolère les accents, la casse et l'ordre prénom/nom, et reconnais les formes traduites d'une nationalité (ex. « ivoirien » ≡ « Côte d'Ivoire »). Utilise « uncertain » quand le champ du document est illisible ou absent — ne déduis jamais un « mismatch » d'une simple photo floue. Sois strict sur isIdDocument et legible.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Lis cette pièce d'identité et extrais les champs structurés.${declared}`,
          },
          { type: "image", image },
        ],
      },
    ],
  });

  return object;
}
