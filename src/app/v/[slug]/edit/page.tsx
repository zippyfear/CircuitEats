import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { currentUser, isVendorOwner } from "@/lib/roles";
import VendorEditForm from "@/components/VendorEditForm";

export const dynamic = "force-dynamic";

export default async function EditVendor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  const vendor = await db.vendor.findUnique({ where: { slug }, include: { items: { orderBy: { name: "asc" } } } });
  if (!vendor) notFound();
  if (!user || !(await isVendorOwner(user.id, vendor.id))) redirect(`/v/${slug}`);
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return <VendorEditForm vendor={JSON.parse(JSON.stringify(vendor))} categories={categories} />;
}
