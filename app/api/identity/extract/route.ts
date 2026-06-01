import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { extractIdFields } from "@/lib/ai/id-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
  contentType: z.string().min(1),
  claims: z
    .object({
      fullName: z.string().max(120).optional().nullable(),
      nationality: z.string().max(60).optional().nullable(),
    })
    .optional(),
});

/**
 * Reads an already-uploaded ID scan with the vision model and returns
 * structured fields to pre-fill the booking form. Stateless: extracted data is
 * NOT persisted here — it only reaches the database when the guest confirms the
 * booking (with explicit RGPD consent). On any failure we return HTTP 200 with
 * `ok:false` so the chat widget degrades gracefully to manual entry.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp();
  const limit = await checkRateLimit("id-extract", ip, 10, "10 m");
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Paramètres manquants" },
      { status: 400 }
    );
  }

  const { url, key, contentType, claims } = parsed.data;

  // Only ever read files we produced under the id-scans/ prefix.
  if (!key.startsWith("id-scans/")) {
    return NextResponse.json(
      { ok: false, error: "Clé invalide" },
      { status: 400 }
    );
  }

  // Vision OCR is image-only; PDFs are uploaded but not read automatically.
  if (contentType === "application/pdf") {
    return NextResponse.json({ ok: false, skipped: true });
  }

  try {
    const fields = await extractIdFields({ url, key, contentType, claims });
    return NextResponse.json({ ok: true, fields });
  } catch (e) {
    console.error("[id-extract]", e);
    // Graceful: the guest fills the fields manually.
    return NextResponse.json({
      ok: false,
      error: "Lecture automatique indisponible",
    });
  }
}
