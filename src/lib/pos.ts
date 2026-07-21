import { randomUUID } from "crypto";

// ── POS handoff adapters ─────────────────────────────────────────────────────
// Circuit builds the order; a POS (Toast/Square) processes it. The adapter is the
// swappable seam. MOCK lets the whole flow be tested in dev with no external
// account; SQUARE/TOAST are stubs until their connectors + credentials land.

export type PosOrderLine = { name: string; variantLabel?: string | null; priceCents: number; qty: number; posRef?: string | null };
export type PosOrder = { vendorId: string; tableLabel?: string | null; notes?: string | null; totalCents: number; lines: PosOrderLine[] };
export type PosConnLike = { provider: "MOCK" | "SQUARE" | "TOAST"; externalRef?: string | null; accessToken?: string | null };
export type PosResult = { accepted: boolean; posOrderId: string | null; message: string };

export interface PosAdapter {
  submitOrder(order: PosOrder, conn: PosConnLike): Promise<PosResult>;
}

// MOCK — always accepts; returns a fake ticket id. Fully testable.
const mockAdapter: PosAdapter = {
  async submitOrder(order) {
    return { accepted: true, posOrderId: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`, message: `Mock POS accepted ${order.lines.reduce((n, l) => n + l.qty, 0)} item(s).` };
  },
};

// SQUARE / TOAST — stubs. Wire real Orders-API calls (+ credentials) here later.
// Until then they cleanly report "not configured" and the order still lives in
// Circuit (posOrderId null) so nothing breaks in testing.
const notConfigured = (name: string): PosAdapter => ({
  async submitOrder() { return { accepted: false, posOrderId: null, message: `${name} connector not configured yet (stub).` }; },
});

export function getPosAdapter(provider: "MOCK" | "SQUARE" | "TOAST"): PosAdapter {
  switch (provider) {
    case "MOCK": return mockAdapter;
    case "SQUARE": return notConfigured("Square");
    case "TOAST": return notConfigured("Toast");
    default: return mockAdapter;
  }
}
