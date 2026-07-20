import { redirect } from "next/navigation";
import { currentUser, isPlatformAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

const NAV: [string, string][] = [
  ["/admin", "Overview"],
  ["/admin/users", "Users & permissions"],
  ["/admin/events", "Events"],
  ["/admin/vendors", "Vendors & menus"],
  ["/admin/promo", "Promo CTR"],
  ["/admin/audit", "Audit log"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (!(await isPlatformAdmin(user.id))) redirect("/");

  return (
    <>
      <header className="adminhdr">
        <div className="adminhdr-in">
          <a href="/admin" className="adminbrand">⚙ CircuitEats Admin</a>
          <nav className="adminnav">
            {NAV.map(([href, label]) => <a key={href} href={href} className="adminnav-link">{label}</a>)}
          </nav>
          <a href="/" className="adminhome">← Site</a>
        </div>
      </header>
      {children}
    </>
  );
}
