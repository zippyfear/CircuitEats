import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { currentUser, isEventCoordinator } from "@/lib/roles";
import { resolveEventConfig } from "@/lib/config";
import EventManageForm from "@/components/EventManageForm";

export const dynamic = "force-dynamic";

export default async function ManageEvent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await currentUser();
  const event = await db.event.findUnique({ where: { slug } });
  if (!event) notFound();
  if (!me || !(await isEventCoordinator(me.id, event.id))) redirect(`/e/${slug}`);
  const cfg = await resolveEventConfig(slug);
  return <EventManageForm eventId={event.id} slug={slug} name={event.name} cfg={JSON.parse(JSON.stringify(cfg))} />;
}
