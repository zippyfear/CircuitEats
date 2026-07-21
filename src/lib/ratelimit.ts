import { NextResponse } from "next/server";

// Simple in-memory fixed-window rate limiter. Fine for a single pm2 instance;
// swap for Redis if we ever scale horizontally. Keyed by user (if signed in)
// else client IP, per endpoint name.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// evict expired windows so the map can't grow unbounded
const timer = setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k); }, 60_000);
(timer as unknown as { unref?: () => void }).unref?.();

function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + windowMs }; buckets.set(key, b); }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

function clientKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

// Returns a 429 NextResponse if over the limit, else null. Call at the top of a
// write handler:  const rl = checkLimit(req, user?.id, "rate", 30, 60_000); if (rl) return rl;
export function checkLimit(req: Request, userId: string | null | undefined, name: string, limit: number, windowMs = 60_000) {
  const r = hit(`${name}:${clientKey(req, userId)}`, limit, windowMs);
  if (!r.ok) return NextResponse.json({ error: "Too many requests — slow down and try again shortly." }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
  return null;
}
