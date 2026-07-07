import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getProductsSold } from "@/server/services/product.service";
import { redirect } from "next/navigation";

export default async function ProductsSoldReportPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const productsSold = await getProductsSold();
  const totalUnits = productsSold.reduce((sum, p) => sum + p.unitsSold, 0);
  const totalRevenue = productsSold.reduce((sum, p) => sum + Number(p.revenue), 0);

  return (
    <DashboardShell role="ADMIN">
      <div className="content-stack">
        <PageHeader
          kicker="Admin operations"
          title="Products sold"
          subtitle="Units sold and revenue by product, across all orders."
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="stat-card">
            <p className="stat-label">Products sold</p>
            <p className="stat-value">{productsSold.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total units sold</p>
            <p className="stat-value">{totalUnits}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total revenue</p>
            <p className="stat-value">${totalRevenue.toFixed(2)}</p>
          </div>
        </section>

        <section className="card-dashboard overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">By product</h2>
            <span className="text-xs text-muted-foreground">
              Sorted by units sold
            </span>
          </div>
          {productsSold.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Units sold</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {productsSold.map((p) => (
                    <tr key={p.productId} className="table-row">
                      <td className="px-4 py-3 font-semibold">{p.productName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.categoryName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.unitsSold}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">${p.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
