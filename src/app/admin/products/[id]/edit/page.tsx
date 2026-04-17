import { DashboardShell } from "@/components/DashboardShell";
import { ProductMetaForm } from "@/components/ProductMetaForm";
import { VariantManager } from "@/components/VariantManager";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { size: "asc" } } },
  });
  if (!product) notFound();

  const variantInitial = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    price: v.price.toFixed(2),
    stock: v.stock,
    unit: v.unit as "PIECE" | "METER",
  }));

  return (
    <DashboardShell role="ADMIN">
      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <p className="section-kicker">Catalog maintenance</p>
        <h1 className="dash-title mt-3">Refine product metadata and keep variants accurate.</h1>
        <p className="dash-desc mt-3">{product.name}</p>
      </section>
      <div className="space-y-8">
        <ProductMetaForm
          productId={product.id}
          initial={{
            name: product.name,
            categoryId: product.categoryId,
            hasVariants: product.hasVariants,
            isActive: product.isActive,
          }}
        />
        <VariantManager productId={product.id} initial={variantInitial} />
      </div>
    </DashboardShell>
  );
}
