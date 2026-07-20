import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser, isVendorOwner } from "@/lib/roles";

// Owner-only menu editing. POST = create/update an item; DELETE = remove.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { vendorId, itemId, name, categoryId, priceCents } = await req.json();
  if (!vendorId || !(await isVendorOwner(user.id, vendorId))) return NextResponse.json({ error: "Not your vendor." }, { status: 403 });
  if (!name || !String(name).trim()) return NextResponse.json({ error: "name required." }, { status: 400 });

  const fields = {
    name: String(name).trim(),
    categoryId: categoryId || null,
    typicalPriceCents: typeof priceCents === "number" ? priceCents : null,
  };

  if (itemId) {
    const it = await db.item.findUnique({ where: { id: itemId }, select: { vendorId: true } });
    if (it?.vendorId !== vendorId) return NextResponse.json({ error: "Item not on this vendor." }, { status: 403 });
    const updated = await db.item.update({ where: { id: itemId }, data: fields });
    return NextResponse.json({ ok: true, id: updated.id });
  }
  const created = await db.item.create({ data: { vendorId, ...fields } });
  return NextResponse.json({ ok: true, id: created.id });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { itemId } = await req.json();
  const it = await db.item.findUnique({ where: { id: itemId }, select: { vendorId: true } });
  if (!it || !(await isVendorOwner(user.id, it.vendorId))) return NextResponse.json({ error: "Not your item." }, { status: 403 });
  // clear FK dependents (no cascade in schema)
  await db.rating.deleteMany({ where: { itemId } });
  await db.photo.deleteMany({ where: { itemId } });
  await db.item.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
