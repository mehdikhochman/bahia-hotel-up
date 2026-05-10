/**
 * Edge-safe JWT helpers — no bcrypt, no Prisma.
 * Importable from middleware.ts.
 */
import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@prisma/client";

export const SESSION_COOKIE = "bahia_admin";
export const SESSION_TTL_SEC = 60 * 60 * 8;

export type AdminSession = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET missing or too short (need ≥32 chars). Generate: openssl rand -base64 48"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: AdminSession) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .setSubject(payload.id)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.fullName !== "string" ||
      typeof payload.role !== "string"
    )
      return null;
    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role as AdminRole,
    };
  } catch {
    return null;
  }
}
