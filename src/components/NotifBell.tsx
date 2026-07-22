import { currentUser } from "@/lib/roles";
import { unreadNotifCount } from "@/lib/notifications";

// Header notification bell — unread count of followed-vendor upcoming appearances.
// Only rendered for signed-in users; links to the /following feed.
export default async function NotifBell() {
  const me = await currentUser();
  if (!me) return null;
  const n = await unreadNotifCount(me.id);
  return (
    <a className="notifbell" href="/following" aria-label={`Notifications${n > 0 ? ` (${n} new)` : ""}`}>
      <span className="notifbell-ico">🔔</span>
      {n > 0 && <span className="notifdot">{n > 9 ? "9+" : n}</span>}
    </a>
  );
}
