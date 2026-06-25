import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listMyOrders } from "@/server/services/order.service";
import { serializeOrderRow } from "@/server/serialize";
import { redirect } from "next/navigation";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const fmt = (dt: Date) => dt.toDateString();
  if (fmt(d) === fmt(today)) return "Today";
  if (fmt(d) === fmt(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    redirect("/login");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { data, pagination } = await listMyOrders(session.sub, page, 20);

  const totalValue = data.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const openCount = data.filter((o) => o.status !== "DELIVERED").length;

  return (
    <DashboardShell role="CUSTOMER">
      <div className="content-stack">
        <PageHeader
          kicker="Order history"
          title="Orders"
          subtitle="Track status, value, and open each order for invoice and line details."
          actions={
            <Link href="/orders/checkout" className="btn-primary w-full lg:w-auto">
              New order
            </Link>
          }
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="stat-card">
            <p className="stat-label">Orders this page</p>
            <p className="stat-value">{data.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">In progress</p>
            <p className="stat-value">{openCount}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Page value</p>
            <p className="stat-value">${totalValue.toFixed(2)}</p>
          </div>
        </section>

        {data.length === 0 ? (
          <div className="card-dashboard flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">No orders yet</p>
            <Link href="/" className="btn-primary mt-5">
              Open catalog
            </Link>
          </div>
        ) : (() => {
          const rows = data.map(serializeOrderRow);
          const groups: { label: string; orders: typeof rows }[] = [];
          for (const o of rows) {
            const label = dateLabel(o.createdAt);
            const last = groups[groups.length - 1];
            if (last && last.label === label) {
              last.orders.push(o);
            } else {
              groups.push({ label, orders: [o] });
            }
          }
          return (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</p>
                  <div className="table-shell overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead>
                        <tr className="table-head">
                          <th className="px-4 py-3 font-medium">Order #</th>
                          <th className="px-4 py-3 font-medium">Your Ref</th>
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Total</th>
                          <th className="px-4 py-3 text-right font-medium">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders.map((s) => (
                          <tr key={s.id} className="table-row">
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.orderNumber}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{s.customerReference ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td>
                            <td className="px-4 py-3">
                              <OrderStatusBadge status={s.status} />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">${s.totalAmount}</td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/orders/${s.id}`} className="font-semibold text-primary hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {pagination.totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 ? (
              <Link href={`/orders?page=${page - 1}`} className="btn-secondary h-9 px-3 text-xs">
                Previous
              </Link>
            ) : null}
            <span className="px-3 text-xs text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            {page < pagination.totalPages ? (
              <Link href={`/orders?page=${page + 1}`} className="btn-secondary h-9 px-3 text-xs">
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </DashboardShell>
  );
}
