import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { currentUser, isVendorOwner, isPlatformAdmin } from "@/lib/roles";
import OrderQueue from "@/components/OrderQueue";

export const dynamic = "force-dynamic";

export default async function VendorOrders({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  const vendor = await db.vendor.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!vendor) notFound();
  if (!user || !((await isVendorOwner(user.id, vendor.id)) || (await isPlatformAdmin(user.id)))) redirect(`/v/${slug}`);

  const orders = await db.order.findMany({
    where: { appearance: { vendorId: vendor.id }, status: { in: ["PLACED", "PREPARING", "READY"] } },
    orderBy: { createdAt: "asc" },
    include: { items: true, user: { select: { displayName: true, email: true } } },
  });

  return <OrderQueue vendorName={vendor.name} orders={JSON.parse(JSON.stringify(orders))} />;
}
