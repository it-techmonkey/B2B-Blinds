import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { DeleteProductButton } from "@/components/DeleteProductButton";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listProductsAdmin, getProductStats } from "@/server/services/product.service";
import { redirect } from "next/navigation";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ data, pagination }, stats] = await Promise.all([
    listProductsAdmin(page, 20),
    getProductStats(),
  ]);

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

        <div className="table-shell overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Variants</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="table-row">
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.hasVariants ? `${p.variants.length} sizes` : "Simple"}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {p.priceFrom === p.priceTo ? `$${p.priceFrom}` : `$${p.priceFrom}–${p.priceTo}`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.totalStock}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${p.isActive ? "badge-completed" : "badge-neutral"}`}>
                    {p.isActive ? "On" : "Off"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <Link href={`/admin/products/${p.id}/edit`} className="font-semibold text-primary hover:underline">
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

        {pagination.totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 ? (
              <Link href={`/admin/products?page=${page - 1}`} className="btn-secondary h-9 px-3 text-xs">
                Previous
              </Link>
            ) : null}
            <span className="px-3 text-xs text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            {page < pagination.totalPages ? (
              <Link href={`/admin/products?page=${page + 1}`} className="btn-secondary h-9 px-3 text-xs">
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </DashboardShell>
  );
}
