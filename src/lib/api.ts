import { NextResponse } from "next/server";

// ── Standard API response envelope (v1) ──
// Success: { ok: true, data: <payload>, meta?: {...} }
// Error:   { ok: false, error: { code, message } }
// Clients depend on this shape; keep it stable within a version.

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json(meta ? { ok: true, data, meta } : { ok: true, data });
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

// Pagination: ?page (1-based) & ?limit (default 20, max 100). Returns skip/take + echo.
export function pageParams(url: URL, defLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(url.searchParams.get("limit") || String(defLimit), 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}
