import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Pick the next host-promo message for the viewer's segment (event context if any,
// else global browsing). Selection is weighted by smoothed CTR: every active message
// keeps a chance (so it visibly rotates each minute) while higher-CTR messages show
// more often. Impressions are logged only for logged-in viewers.
export async function GET(req: Request) {
  const eventSlug = new URL(req.url).searchParams.get("eventSlug") || null;
  const user = await currentUser();

  const event = eventSlug ? await db.event.findUnique({ where: { slug: eventSlug }, select: { id: true, city: true, region: true } }) : null;
  const seg = { eventId: event?.id ?? null, city: event?.city ?? null, region: event?.region ?? null };

  const messages = await db.promoMessage.findMany({ where: { active: true } });
  if (messages.length === 0) return NextResponse.json({ message: null, authed: !!user });

  // CTR within this segment (eventId match; null = global browsing)
  const stats = await db.promoStat.groupBy({ by: ["messageId", "kind"], where: { eventId: seg.eventId }, _count: { _all: true } });
  const impr = new Map<string, number>(), clk = new Map<string, number>();
  for (const s of stats) (s.kind === "CLICK" ? clk : impr).set(s.messageId, s._count._all);
  // smoothed CTR — Beta(1,1) prior mean: (clicks+1)/(impressions+2)
  const weight = (id: string) => ((clk.get(id) ?? 0) + 1) / ((impr.get(id) ?? 0) + 2);

  // weighted random pick
  const weights = messages.map((m) => weight(m.id));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let chosen = messages[0];
  for (let i = 0; i < messages.length; i++) { r -= weights[i]; if (r <= 0) { chosen = messages[i]; break; } }

  if (user) await db.promoStat.create({ data: { messageId: chosen.id, kind: "IMPRESSION", ...seg, userId: user.id } });

  return NextResponse.json({
    message: { id: chosen.id, lead: chosen.lead, blurb: chosen.blurb, ctaLabel: chosen.ctaLabel, url: chosen.url },
    authed: !!user,
  });
}
