import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { DeleteProductButton } from "@/components/DeleteProductButton";
import { getSession } from "@/lib/auth/get-session";
import { listProductsAdmin } from "@/server/services/product.service";
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
  const { data, pagination } = await listProductsAdmin(page, 20);

  const activeCount = data.filter((p) => p.isActive).length;
  const variantCount = data.reduce((sum, p) => sum + p.variants.length, 0);
  const stockCount = data.reduce((sum, p) => sum + p.totalStock, 0);

  return (
    <DashboardShell role="ADMIN">
      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="dash-title mt-3">Products</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/admin/products/new" className="btn-primary w-full shrink-0 sm:w-auto">
              Add product
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 xl:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Products on page</p>
          <p className="stat-value">{data.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active / total variants</p>
          <p className="stat-value">{activeCount} / {variantCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total stock units</p>
          <p className="stat-value">{stockCount}</p>
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
        <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pagination">
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
    </DashboardShell>
  );
}
