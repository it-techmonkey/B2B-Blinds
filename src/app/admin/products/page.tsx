import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminProductsTable } from "@/components/AdminProductsTable";
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

        <AdminProductsTable products={data} />
      </div>
    </DashboardShell>
  );
}
