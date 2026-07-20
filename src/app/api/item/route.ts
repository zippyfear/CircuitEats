import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser, isVendorOwner, isPlatformAdmin } from "@/lib/roles";
import { recordAudit, snapItem } from "@/lib/audit";

// Menu editing — owner or platform admin. POST = create/update an item; DELETE = remove. Audited.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { vendorId, itemId, name, categoryId, priceCents, unit, variants } = await req.json();
  if (!vendorId || !((await isVendorOwner(user.id, vendorId)) || (await isPlatformAdmin(user.id)))) return NextResponse.json({ error: "Not your vendor." }, { status: 403 });
  if (!name || !String(name).trim()) return NextResponse.json({ error: "name required." }, { status: 400 });

  // normalize portion variants (optional). When provided, they replace the item's set
  // and typicalPriceCents becomes the "from" (min) price. qty = # of base units (e.g. ribs)
  // in the portion, used for the per-unit average.
  type VIn = { label?: unknown; priceCents?: unknown; note?: unknown; qty?: unknown };
  let clean: { label: string; priceCents: number; note: string | null; qty: number | null; sortOrder: number }[] | null = null;
  if (Array.isArray(variants)) {
    clean = (variants as VIn[])
      .filter((v) => v && String(v.label ?? "").trim() && typeof v.priceCents === "number" && Number.isFinite(v.priceCents) && (v.priceCents as number) >= 0)
      .map((v, i) => ({ label: String(v.label).trim(), priceCents: Math.round(v.priceCents as number), note: v.note ? String(v.note).trim() : null, qty: typeof v.qty === "number" && Number.isFinite(v.qty) && v.qty > 0 ? v.qty : null, sortOrder: i }));
  }
  const priceFromVariants = clean && clean.length ? Math.min(...clean.map((v) => v.priceCents)) : null;

  const fields = {
    name: String(name).trim(),
    categoryId: categoryId || null,
    unit: unit && String(unit).trim() ? String(unit).trim() : null,
    typicalPriceCents: clean ? priceFromVariants : (typeof priceCents === "number" ? priceCents : null),
  };

  let id: string;
  let isCreate = false;
  let before = null;
  if (itemId) {
    const it = await db.item.findUnique({ where: { id: itemId }, select: { vendorId: true } });
    if (it?.vendorId !== vendorId) return NextResponse.json({ error: "Item not on this vendor." }, { status: 403 });
    before = await snapItem(itemId);
    const updated = await db.item.update({ where: { id: itemId }, data: fields });
    id = updated.id;
  } else {
    const created = await db.item.create({ data: { vendorId, ...fields } });
    id = created.id;
    isCreate = true;
  }
  if (clean) {
    await db.itemVariant.deleteMany({ where: { itemId: id } });
    if (clean.length) await db.itemVariant.createMany({ data: clean.map((v) => ({ ...v, itemId: id })) });
  }
  const after = await snapItem(id);
  await recordAudit({ actorId: user.id, action: isCreate ? "CREATE" : "UPDATE", entityType: "Item", entityId: id, label: fields.name, before, after });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { itemId } = await req.json();
  const it = await db.item.findUnique({ where: { id: itemId }, select: { vendorId: true, name: true } });
  if (!it || !((await isVendorOwner(user.id, it.vendorId)) || (await isPlatformAdmin(user.id)))) return NextResponse.json({ error: "Not your item." }, { status: 403 });
  const before = await snapItem(itemId);
  // clear FK dependents (variants cascade; ratings/photos do not)
  await db.rating.deleteMany({ where: { itemId } });
  await db.photo.deleteMany({ where: { itemId } });
  await db.item.delete({ where: { id: itemId } });
  await recordAudit({ actorId: user.id, action: "DELETE", entityType: "Item", entityId: itemId, label: it.name, before, after: null });
  return NextResponse.json({ ok: true });
}
