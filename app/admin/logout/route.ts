import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const GET = handle;
export const POST = handle;
