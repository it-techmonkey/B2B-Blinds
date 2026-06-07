import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { DeleteProductButton } from "@/components/DeleteProductButton";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listAllProductsAdmin, getProductStats } from "@/server/services/product.service";
import { redirect } from "next/navigation";

export default async function AdminProductsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const [data, stats] = await Promise.all([
    listAllProductsAdmin(),
    getProductStats(),
  ]);

  // Group by category, preserving alphabetical category order
  const grouped = new Map<string, typeof data>();
  for (const p of data) {
    const key = p.category.name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  return (
    <DashboardShell role="ADMIN">
      <div className="content-stack">
        <PageHeader
          kicker="Admin operations"
          title="Products"
          subtitle="Maintain catalog availability, variant pricing, and stock levels."
          actions={
            <Link href="/admin/products/new" className="btn-primary w-full shrink-0 lg:w-auto">
              Add product
            </Link>
          }
        />

        <section className="grid gap-3 xl:grid-cols-3">
          <div className="stat-card">
            <p className="stat-label">Active / total products</p>
            <p className="stat-value">{stats.activeProducts} / {stats.totalProducts}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total variants</p>
            <p className="stat-value">{stats.totalVariants}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total stock units</p>
            <p className="stat-value">{stats.totalStock}</p>
          </div>
        </section>

        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([categoryName, products]) => (
            <section key={categoryName} className="card-dashboard overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">{categoryName}</h2>
                <span className="text-xs text-muted-foreground">
                  {products.length} product{products.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Variants</th>
                      <th className="px-4 py-3 text-right font-medium">Price</th>
                      <th className="px-4 py-3 text-right font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Active</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="table-row">
                        <td className="px-4 py-3 font-semibold">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.hasVariants ? `${p.variants.length} sizes` : "Simple"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {p.priceFrom === p.priceTo
                            ? `$${p.priceFrom}`
                            : `$${p.priceFrom}–${p.priceTo}`}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {p.totalStock}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${p.isActive ? "badge-completed" : "badge-neutral"}`}>
                            {p.isActive ? "On" : "Off"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="font-semibold text-primary hover:underline"
                          >
                            Edit
                          </Link>
                          <span className="mx-2 text-muted-foreground">·</span>
                          <DeleteProductButton productId={p.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
