import { db } from "@/lib/db";

// Config-driven engine (§20). The app reads vocabulary + feature-flags from here
// instead of hard-coding "vendor / dish / festival".
export type AppConfig = {
  vocab: { container: string; containerPlural: string; participant: string; participantPlural: string; offering: string; offeringPlural: string };
  features: { rating: boolean; voting: boolean; ordering: boolean; waitTimes: boolean; ticketing: boolean; schedule: boolean };
  theme: { accent: string };
};

export const PLATFORM_DEFAULTS: AppConfig = {
  vocab: { container: "Event", containerPlural: "Events", participant: "Vendor", participantPlural: "Vendors", offering: "Item", offeringPlural: "Items" },
  features: { rating: true, voting: false, ordering: false, waitTimes: false, ticketing: false, schedule: false },
  theme: { accent: "#DE7127" },
};

function merge(base: AppConfig, over: any): AppConfig {
  if (!over) return base;
  return {
    vocab: { ...base.vocab, ...(over.vocab ?? {}) },
    features: { ...base.features, ...(over.features ?? {}) },
    theme: { ...base.theme, ...(over.theme ?? {}) },
  };
}

// Resolution order (§20.6): platform defaults ← EventType preset ← Event.config override.
export async function resolveEventConfig(eventSlug: string): Promise<AppConfig> {
  const event = await db.event.findFirst({ where: { slug: eventSlug }, include: { eventType: true } });
  if (!event) return PLATFORM_DEFAULTS;
  let cfg = PLATFORM_DEFAULTS;
  if (event.eventType) cfg = merge(cfg, { vocab: event.eventType.vocab, features: event.eventType.features, theme: event.eventType.theme });
  if (event.config) cfg = merge(cfg, event.config);
  return cfg;
}
