import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readIdScanLocal } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated scan proxy.
 *
 *   GET /admin/api/scan/[bookingId]               → ID recto (front)
 *   GET /admin/api/scan/[bookingId]?side=back     → ID verso (back)
 *   GET /admin/api/scan/[bookingId]?doc=receipt   → Wave payment receipt
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
  const doc = url.searchParams.get("doc") === "receipt" ? "receipt" : "id";
  const side = url.searchParams.get("side") === "back" ? "back" : "front";

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { identification: true, payment: true },
  });
  if (!booking) {
    return new NextResponse("Not found", { status: 404 });
  }

  let targetUrl: string | null = null;
  let targetKey: string | null = null;
  let auditLabel: string;

  if (doc === "receipt") {
    if (!booking.payment) {
      return new NextResponse("Not found", { status: 404 });
    }
    targetUrl = booking.payment.receiptUrl;
    targetKey = booking.payment.receiptKey;
    auditLabel = "Wave receipt";
  } else {
    if (!booking.identification) {
      return new NextResponse("Not found", { status: 404 });
    }
    const ident = booking.identification;
    targetUrl = side === "back" ? ident.imageBackUrl : ident.imageUrl;
    targetKey = side === "back" ? ident.imageBackKey : ident.imageKey;
    auditLabel = `ID scan (${side})`;
  }

  if (!targetUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  // eslint-disable-next-line no-console
  console.log(
    `[audit] ${session.email} viewed ${auditLabel} for booking ${booking.reference}`
  );

  const suffix = doc === "receipt" ? "receipt" : side;
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
        "Content-Disposition": `inline; filename="${booking.reference}-${suffix}.${ext}"`,
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
        "Content-Disposition": `inline; filename="${booking.reference}-${suffix}.${ext}"`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
