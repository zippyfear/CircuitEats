import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/roles";
import { recordAudit, snapUser } from "@/lib/audit";

// Platform-admin user + permission management. Single POST dispatched by `op`.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json();
  const op = body.op as string;

  try {
    if (op === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
      const exists = await db.user.findUnique({ where: { email } });
      if (exists) return NextResponse.json({ error: "User already exists." }, { status: 409 });
      const u = await db.user.create({ data: { email, displayName: email.split("@")[0], reviewerScore: 0.5 } });
      await recordAudit({ actorId: admin.id, action: "CREATE", entityType: "User", entityId: u.id, label: email, before: null, after: await snapUser(u.id) });
      return NextResponse.json({ ok: true, id: u.id });
    }

    if (op === "update") {
      const userId = String(body.userId ?? "");
      const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
      if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
      const before = await snapUser(userId);
      const data: Record<string, unknown> = {};
      if (typeof body.displayName === "string") data.displayName = body.displayName.trim() || null;
      if (typeof body.reviewerScore === "number" && body.reviewerScore >= 0 && body.reviewerScore <= 1) data.reviewerScore = body.reviewerScore;
      await db.user.update({ where: { id: userId }, data });
      await recordAudit({ actorId: admin.id, action: "UPDATE", entityType: "User", entityId: userId, label: target.email, before, after: await snapUser(userId) });
      return NextResponse.json({ ok: true });
    }

    if (op === "setAdmin") {
      const userId = String(body.userId ?? "");
      const value = !!body.value;
      if (userId === admin.id && !value) return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
      const target = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
      const existing = await db.membership.findFirst({ where: { userId, scope: "PLATFORM", role: "ADMIN" } });
      if (value && !existing) {
        const m = await db.membership.create({ data: { userId, scope: "PLATFORM", role: "ADMIN" } });
        await recordAudit({ actorId: admin.id, action: "CREATE", entityType: "Membership", entityId: m.id, label: `Grant ADMIN → ${target.email}`, before: null, after: { userId, scope: "PLATFORM", role: "ADMIN", targetId: null } });
      } else if (!value && existing) {
        await db.membership.delete({ where: { id: existing.id } });
        await recordAudit({ actorId: admin.id, action: "DELETE", entityType: "Membership", entityId: existing.id, label: `Revoke ADMIN → ${target.email}`, before: { userId, scope: "PLATFORM", role: "ADMIN", targetId: null }, after: null });
      }
      return NextResponse.json({ ok: true });
    }

    if (op === "grant") {
      const { userId, scope, targetId, role } = body as { userId: string; scope: "EVENT" | "VENDOR"; targetId: string; role: string };
      if (!userId || !["EVENT", "VENDOR"].includes(scope) || !targetId || !role) return NextResponse.json({ error: "userId, scope, targetId, role required." }, { status: 400 });
      const target = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      const existing = await db.membership.findFirst({ where: { userId, scope, targetId } });
      const m = existing
        ? await db.membership.update({ where: { id: existing.id }, data: { role: role as never } })
        : await db.membership.create({ data: { userId, scope, targetId, role: role as never } });
      await recordAudit({ actorId: admin.id, action: existing ? "UPDATE" : "CREATE", entityType: "Membership", entityId: m.id, label: `${role} ${scope} → ${target?.email ?? userId}`, before: existing ? { userId, scope, targetId, role: existing.role } : null, after: { userId, scope, targetId, role } });
      return NextResponse.json({ ok: true, id: m.id });
    }

    if (op === "revoke") {
      const membershipId = String(body.membershipId ?? "");
      const m = await db.membership.findUnique({ where: { id: membershipId } });
      if (!m) return NextResponse.json({ error: "Membership not found." }, { status: 404 });
      if (m.scope === "PLATFORM" && m.userId === admin.id) return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
      await db.membership.delete({ where: { id: membershipId } });
      await recordAudit({ actorId: admin.id, action: "DELETE", entityType: "Membership", entityId: membershipId, label: `Revoke ${m.role} ${m.scope}`, before: { userId: m.userId, scope: m.scope, targetId: m.targetId, role: m.role }, after: null });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown op." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
