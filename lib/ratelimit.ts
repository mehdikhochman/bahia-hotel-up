/**
 * Rate limiting via Upstash Redis. Edge-safe (uses REST API).
 *
 * Configure with:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If either env var is missing we no-op (always allow) and log once at boot —
 * keeps local dev frictionless while protecting prod automatically.
 */
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[ratelimit] disabled — set UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN to enable"
  );
}

type Window = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

const limiters = new Map<string, Ratelimit>();

function getLimiter(bucket: string, max: number, window: Window) {
  const key = `${bucket}:${max}:${window}`;
  let l = limiters.get(key);
  if (!l && redis) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `bahia:${bucket}`,
      analytics: false,
    });
    limiters.set(key, l);
  }
  return l;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

/** Returns `{ ok: false }` if the key has exceeded the limit. Always `{ ok: true }` when Redis isn't configured. */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  max: number,
  window: Window
): Promise<RateLimitResult> {
  if (!redis) return { ok: true, remaining: max, resetMs: 0 };
  const limiter = getLimiter(bucket, max, window);
  if (!limiter) return { ok: true, remaining: max, resetMs: 0 };
  const r = await limiter.limit(identifier);
  return { ok: r.success, remaining: r.remaining, resetMs: r.reset };
}

/** Best-effort client IP extraction (works on Vercel, falls back to "anonymous"). */
export function getClientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return (
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("fly-client-ip") ||
    "anonymous"
  );
}
