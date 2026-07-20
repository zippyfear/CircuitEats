import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import CategoryView from "@/components/CategoryView";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string; cslug: string }> }) {
  const { slug, cslug } = await params;
  const event = await db.event.findUnique({ where: { slug } });
  if (!event) notFound();
  const category = await db.category.findUnique({ where: { slug: cslug } });
  if (!category) notFound();

  // categories present at this event (for paging + chips)
  const apps = await db.appearance.findMany({ where: { eventId: event.id }, include: { vendor: { include: { items: { include: { category: true } } } } } });
  const catMap = new Map<string, { slug: string; name: string; sortOrder: number }>();
  for (const a of apps) for (const it of a.vendor.items) if (it.category) catMap.set(it.category.slug, { slug: it.category.slug, name: it.category.name, sortOrder: it.category.sortOrder });
  const cats = Array.from(catMap.values()).sort((a, b) => a.sortOrder - b.sortOrder).map(({ slug, name }) => ({ slug, name }));
  const idx = Math.max(0, cats.findIndex((c) => c.slug === cslug));
  const prev = cats.length ? cats[(idx - 1 + cats.length) % cats.length] : { slug: cslug, name: category.name };
  const next = cats.length ? cats[(idx + 1) % cats.length] : { slug: cslug, name: category.name };

  return <CategoryView eventSlug={slug} eventName={event.name} catSlug={cslug} cats={cats} prev={prev} next={next} />;
}
