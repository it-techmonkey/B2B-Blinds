import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getProductsSold } from "@/server/services/product.service";
import { redirect } from "next/navigation";

type SortField = "product" | "category" | "units" | "revenue";
type SortDirection = "asc" | "desc";
function isSortField(value: string | undefined): value is SortField { return value === "product" || value === "category" || value === "units" || value === "revenue"; }
function SortHeader({ field, label, activeField, direction }: { field: SortField; label: string; activeField: SortField; direction: SortDirection }) {
  const active = field === activeField;
  const next: SortDirection = active && direction === "asc" ? "desc" : "asc";
  return <Link href={`/admin/reports/products-sold?sort=${field}&direction=${next}`} className="inline-flex items-center gap-1 font-medium hover:text-foreground">{label}<span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></Link>;
}

export default async function ProductsSoldReportPage({ searchParams }: { searchParams: Promise<{ sort?: string; direction?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const query = await searchParams;
  const sort = isSortField(query.sort) ? query.sort : "units";
  const direction: SortDirection = query.direction === "asc" ? "asc" : "desc";
  const productsSold = (await getProductsSold()).sort((a, b) => {
    const left = sort === "product" ? a.productName : sort === "category" ? a.categoryName : sort === "units" ? a.unitsSold : Number(a.revenue);
    const right = sort === "product" ? b.productName : sort === "category" ? b.categoryName : sort === "units" ? b.unitsSold : Number(b.revenue);
    const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
    return direction === "asc" ? comparison : -comparison;
  });
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
              Select a column to sort
            </span>
          </div>
          {productsSold.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3"><SortHeader field="product" label="Product" activeField={sort} direction={direction} /></th>
                    <th className="px-4 py-3"><SortHeader field="category" label="Category" activeField={sort} direction={direction} /></th>
                    <th className="px-4 py-3 text-right"><SortHeader field="units" label="Units sold" activeField={sort} direction={direction} /></th>
                    <th className="px-4 py-3 text-right"><SortHeader field="revenue" label="Revenue" activeField={sort} direction={direction} /></th>
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
import Link from "next/link";
