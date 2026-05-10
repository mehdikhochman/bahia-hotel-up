import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-jwt";

const PROTECTED_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";
const LOGOUT_PATH = "/admin/logout";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === LOGIN_PATH;
  const isLogout = pathname === LOGOUT_PATH;
  const protectedRoute =
    pathname.startsWith(PROTECTED_PREFIX) && !isLogin && !isLogout;

  if (!protectedRoute) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
