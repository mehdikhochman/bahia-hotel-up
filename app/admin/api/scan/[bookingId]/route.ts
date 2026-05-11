import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readIdScanLocal } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated ID-scan proxy.
 *
 *   GET /admin/api/scan/[bookingId]            → recto (front)
 *   GET /admin/api/scan/[bookingId]?side=back  → verso (back)
 *
 * Requires an admin session (middleware will redirect to /admin/login if not).
 * Streams the file back through the server so the underlying storage URL is
 * never exposed to the browser. Every access is logged for audit.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const session = await requireAdmin();

  const url = new URL(req.url);
  const side = url.searchParams.get("side") === "back" ? "back" : "front";

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { identification: true },
  });
  if (!booking || !booking.identification) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ident = booking.identification;
  const targetUrl = side === "back" ? ident.imageBackUrl : ident.imageUrl;
  const targetKey = side === "back" ? ident.imageBackKey : ident.imageKey;

  if (!targetUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  // eslint-disable-next-line no-console
  console.log(
    `[audit] ${session.email} viewed ID scan (${side}) for booking ${booking.reference}`
  );

  const ext =
    (targetKey || targetUrl).split(".").pop()?.toLowerCase() || "bin";
  const contentType =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : "image/jpeg";

  // Production: file lives on Vercel Blob
  if (targetUrl.startsWith("http")) {
    const upstream = await fetch(targetUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream error", { status: 502 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${booking.reference}-${side}.${ext}"`,
      },
    });
  }

  // Local dev fallback
  if (!targetKey) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readIdScanLocal(targetKey);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${booking.reference}-${side}.${ext}"`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
