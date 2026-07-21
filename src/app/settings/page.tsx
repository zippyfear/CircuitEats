import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/roles";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?callbackUrl=/settings");
  const u = await db.user.findUnique({ where: { id: user.id }, select: { email: true, ratingMode: true, photoStrikes: true, photoBanned: true, ratingBanned: true } });
  return <SettingsForm user={u!} />;
}
