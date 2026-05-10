import { NextRequest, NextResponse } from "next/server";
import {
  allowedMimeTypes,
  maxUploadBytes,
} from "@/lib/validation";
import { storeIdScan } from "@/lib/storage";
import { generateBookingReference } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp();
  const limit = await checkRateLimit("upload", ip, 5, "1 m");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Fichier manquant" },
      { status: 400 }
    );
  }
  if (!allowedMimeTypes.includes(file.type as (typeof allowedMimeTypes)[number])) {
    return NextResponse.json(
      { error: "Format non supporté (JPG, PNG, WEBP ou PDF)." },
      { status: 415 }
    );
  }
  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (8 Mo max)." },
      { status: 413 }
    );
  }

  // Pre-allocate a draft reference so files can be grouped before booking creation.
  const draftReference =
    (formData.get("draftReference") as string | null) ||
    generateBookingReference("BHA");

  try {
    const stored = await storeIdScan(file, draftReference);
    return NextResponse.json({
      ok: true,
      url: stored.url,
      key: stored.key,
      size: stored.size,
      contentType: stored.contentType,
      draftReference,
    });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json(
      { error: "Échec du téléversement" },
      { status: 500 }
    );
  }
}
