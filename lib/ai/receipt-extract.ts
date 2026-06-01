import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { getVisionModel } from "./client";
import { readIdScanLocal } from "@/lib/storage";
import { formatXOF } from "@/lib/utils";

/**
 * Structured result of reading an uploaded Wave payment receipt with a vision
 * model. Wave has no public verification API, so a human always validates the
 * payment — this extraction only feeds a green/orange/red verdict that guides
 * (never replaces) that manual check. Every field is nullable: the model must
 * never invent values it cannot read.
 */
export const receiptExtractionSchema = z.object({
  isWaveReceipt: z
    .boolean()
    .describe(
      "True only if the image is a Wave money-transfer receipt / confirmation screen (logo, amount, recipient, transaction id). False for unrelated screenshots, photos, blank images, other payment apps."
    ),
  legible: z
    .boolean()
    .describe(
      "True if the receipt is sharp and the key figures (amount, recipient, status) can be read confidently. False if blurry, cropped or too dark."
    ),
  status: z
    .enum(["success", "pending", "failed", "unknown"])
    .describe(
      "Payment status shown on the receipt. success = 'Effectué'/'Réussi'/'Envoyé'; pending = 'En cours'; failed = 'Échoué'/'Annulé'; unknown if not shown."
    ),
  amountReceivedXof: z
    .number()
    .nullable()
    .describe(
      "Amount the recipient receives, in XOF (integer, no separators). On Wave this is usually the 'Montant' sent. Null if unreadable."
    ),
  amountSentXof: z
    .number()
    .nullable()
    .describe(
      "Total amount debited from the sender if shown separately, in XOF. Null if unreadable or not shown."
    ),
  feeXof: z
    .number()
    .nullable()
    .describe("Transaction fee in XOF if shown, otherwise null."),
  transactionId: z
    .string()
    .nullable()
    .describe(
      "Wave transaction / reference id exactly as printed (e.g. 'TX-XXXXXXXX', 'T...'). Null if not visible."
    ),
  senderName: z
    .string()
    .nullable()
    .describe("Name of the person who sent the money, or null."),
  senderPhone: z
    .string()
    .nullable()
    .describe("Sender phone number as printed, or null."),
  recipientName: z
    .string()
    .nullable()
    .describe("Name of the recipient/merchant, or null."),
  recipientPhone: z
    .string()
    .nullable()
    .describe("Recipient phone number as printed, or null."),
  dateText: z
    .string()
    .nullable()
    .describe("Date/time of the transaction exactly as printed, or null."),
  dateIso: z
    .string()
    .nullable()
    .describe("Transaction date in ISO YYYY-MM-DD if readable, otherwise null."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Overall confidence in the extracted figures."),
  tamperConcerns: z
    .array(z.string())
    .describe(
      "Short French flags ONLY for clear signs of tampering/editing (mismatched fonts, misaligned text, pixelated numbers, inconsistent backgrounds). Empty array if the receipt looks genuine. Do NOT add blur/lighting issues here (use 'legible' for those)."
    ),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

export type ReceiptVerdict = "green" | "orange" | "red";

export type ReceiptCheck = {
  verdict: ReceiptVerdict;
  /** Human-readable French lines explaining the verdict (for guest + staff). */
  reasons: string[];
  amountReceivedXof: number | null;
  transactionId: string | null;
  senderName: string | null;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/** Compares two phone numbers by their last 8 digits (ignores +225 / spacing). */
function phonesMatch(a: string | null, b: string | null): boolean | null {
  if (!a || !b) return null;
  const da = onlyDigits(a);
  const db = onlyDigits(b);
  if (da.length < 6 || db.length < 6) return null;
  return da.slice(-8) === db.slice(-8);
}

/**
 * Deterministic verdict from the extracted receipt + the expected payment.
 * red  = a hard discrepancy (wrong amount/recipient, failed status, tampering);
 * orange = something couldn't be verified (illegible, unknown status, missing
 *          figure) — needs a closer manual look;
 * green = amount, recipient and status all line up.
 *
 * This is advisory only: the staff member always makes the final call. Mirrors
 * the identity agent — code does the deterministic comparisons, the model only
 * reads + flags tampering/legibility.
 */
export function computeReceiptVerdict(
  ex: ReceiptExtraction,
  expected: { amountXof: number; waveNumber: string }
): ReceiptCheck {
  const reasons: string[] = [];
  const amount = ex.amountReceivedXof ?? ex.amountSentXof ?? null;
  let red = false;
  let orange = false;

  if (!ex.isWaveReceipt) {
    red = true;
    reasons.push("L'image ne ressemble pas à un reçu Wave.");
  }

  // Status
  if (ex.status === "failed") {
    red = true;
    reasons.push("Le statut indique un paiement échoué ou annulé.");
  } else if (ex.status === "pending") {
    orange = true;
    reasons.push("Paiement encore « en cours » — à confirmer.");
  } else if (ex.status === "unknown") {
    orange = true;
    reasons.push("Statut du paiement illisible.");
  }

  // Amount
  if (amount == null) {
    orange = true;
    reasons.push("Montant illisible sur le reçu.");
  } else if (amount !== expected.amountXof) {
    red = true;
    reasons.push(
      `Montant du reçu (${formatXOF(amount)}) ≠ total à régler (${formatXOF(
        expected.amountXof
      )}).`
    );
  }

  // Recipient number
  const recMatch = phonesMatch(ex.recipientPhone, expected.waveNumber);
  if (recMatch === false) {
    red = true;
    reasons.push(
      `Numéro destinataire (${ex.recipientPhone}) ≠ numéro Wave de l'hôtel.`
    );
  } else if (recMatch === null) {
    orange = true;
    reasons.push("Numéro destinataire non vérifiable — à contrôler.");
  }

  // Tampering / legibility / confidence
  if (ex.tamperConcerns && ex.tamperConcerns.length) {
    red = true;
    for (const c of ex.tamperConcerns) reasons.push(`Altération suspectée : ${c}`);
  }
  if (!ex.legible) {
    orange = true;
    reasons.push("Reçu peu lisible.");
  }
  if (ex.confidence === "low") {
    orange = true;
    reasons.push("Lecture peu fiable.");
  }

  // Date coherence (informational; bumps to orange only, never red)
  if (ex.dateIso) {
    const d = new Date(ex.dateIso);
    if (!isNaN(d.getTime())) {
      const ageDays = (Date.now() - d.getTime()) / 86_400_000;
      if (ageDays > 2) {
        orange = true;
        reasons.push("Date du reçu ancienne — à vérifier.");
      } else if (ageDays < -1) {
        orange = true;
        reasons.push("Date du reçu dans le futur — à vérifier.");
      }
    }
  }

  const verdict: ReceiptVerdict = red ? "red" : orange ? "orange" : "green";
  if (verdict === "green" && reasons.length === 0) {
    reasons.push("Montant, destinataire et statut cohérents.");
  }

  return {
    verdict,
    reasons,
    amountReceivedXof: amount,
    transactionId: ex.transactionId,
    senderName: ex.senderName,
  };
}

type ExtractArgs = {
  url: string;
  key: string;
  contentType: string;
};

/**
 * Reads an uploaded Wave receipt with the vision model and returns the raw
 * structured extraction. Resolves the image from a public Blob URL (production)
 * or the local-dev `local:` sentinel. Throws on provider/credential errors —
 * callers degrade gracefully to a manual-only flow.
 */
export async function extractReceiptFields({
  url,
  key,
  contentType,
}: ExtractArgs): Promise<ReceiptExtraction> {
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
    schema: receiptExtractionSchema,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Tu es un agent de vérification des paiements Wave (mobile money, Côte d'Ivoire) pour un hôtel. Lis UNIQUEMENT ce qui est visible sur le reçu — n'invente jamais, mets null si illisible. Les montants sont en francs CFA (XOF) : renvoie des entiers sans séparateur (ex. « 426 800 F » → 426800). Sois strict sur isWaveReceipt. Ne signale une altération (tamperConcerns) que pour des indices clairs de retouche (polices incohérentes, texte mal aligné, chiffres pixelisés) — le flou ou un mauvais éclairage relèvent de legible, pas d'une altération.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Lis ce reçu de paiement Wave et extrais les champs structurés (montant, destinataire, statut, identifiant de transaction, expéditeur, date).",
          },
          { type: "image", image },
        ],
      },
    ],
  });

  return object;
}
