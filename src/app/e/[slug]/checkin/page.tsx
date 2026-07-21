import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/roles";
import { startOfToday } from "@/lib/presence";

export const dynamic = "force-dynamic";

// QR-scan landing: the event check-in code links here. Creates a QR day-pass
// check-in for the signed-in user, then bounces back to the event page.
export default async function EventCheckIn({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params;
  const { t } = await searchParams;
  const event = await db.event.findUnique({ where: { slug }, select: { id: true, checkInToken: true } });
  if (!event) notFound();

  const user = await currentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(`/e/${slug}/checkin?t=${t ?? ""}`)}`);
  if (!t || t !== event.checkInToken) redirect(`/e/${slug}?checkin=bad`);

  const existing = await db.checkIn.findFirst({ where: { userId: user!.id, eventId: event.id, method: "QR", createdAt: { gte: startOfToday() } } });
  if (!existing) await db.checkIn.create({ data: { userId: user!.id, eventId: event.id, method: "QR" } });

  redirect(`/e/${slug}?checkin=qr`);
}
