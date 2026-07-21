import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser, isVendorOwner, isPlatformAdmin } from "@/lib/roles";

const NEXT: Record<string, string[]> = {
  PLACED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["PICKED_UP"],
  PICKED_UP: [],
  CANCELED: [],
};

// Vendor (owner/admin) advances an order through its lifecycle.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { orderId, status } = await req.json();
  const order = await db.order.findUnique({ where: { id: String(orderId ?? "") }, include: { appearance: { select: { vendorId: true } } } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!((await isVendorOwner(user.id, order.appearance.vendorId)) || (await isPlatformAdmin(user.id)))) return NextResponse.json({ error: "Not your vendor." }, { status: 403 });
  if (!NEXT[order.status]?.includes(status)) return NextResponse.json({ error: `Can't move ${order.status} → ${status}.` }, { status: 400 });

  await db.order.update({ where: { id: order.id }, data: { status, ...(status === "READY" ? { readyAt: new Date() } : {}) } });
  return NextResponse.json({ ok: true, status });
}
