import Link from "next/link";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listAllOrders } from "@/server/services/order.service";
import { serializeOrder } from "@/server/serialize";
import { redirect } from "next/navigation";

export default async function AdminOrdersPage({
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
  const { data, pagination } = await listAllOrders(page, 20);

  const totalValue = data.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const openOrders = data.filter((o) => o.status !== "DELIVERED").length;
  const completed = data.filter((o) => o.status === "DELIVERED").length;

  return (
    <DashboardShell role="ADMIN">
      <div className="content-stack">
        <PageHeader
          kicker="Admin operations"
          title="Orders"
          subtitle="Monitor incoming orders, adjust statuses, and share invoices."
          actions={
            <Link href="/admin/orders/new" className="btn-primary w-full lg:w-auto">
              New order for client
            </Link>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="stat-card">
            <p className="stat-label">Orders on page</p>
            <p className="stat-value">{data.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Open orders</p>
            <p className="stat-value">{openOrders}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Completed orders</p>
            <p className="stat-value">{completed}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Page value</p>
            <p className="stat-value">${totalValue.toFixed(2)}</p>
          </div>
        </section>

        {data.length === 0 ? (
          <div className="card-dashboard flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">No orders to review</p>
            <p className="mt-2 text-sm text-muted-foreground">Incoming customer orders will appear here.</p>
          </div>
        ) : (
          <div className="table-shell overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Ref #</th>
                <th className="px-3 py-3 font-medium">Placed</th>
                <th className="px-3 py-3 font-medium">Items</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">View</th>
                <th className="px-3 py-3 text-right font-medium">PDF Invoice</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => {
                const s = serializeOrder(o);
                const preview =
                  s.items.length <= 2
                    ? s.items.map((i) => i.productName).join(", ")
                    : `${s.items[0]?.productName ?? ""} +${s.items.length - 1}`;

                return (
                  <tr key={s.id} className="table-row">
                    <td className="px-3 py-3 font-semibold text-foreground">{s.customerName}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      <Link href={`/admin/orders/${s.id}`} className="hover:text-foreground hover:underline">
                        {s.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="max-w-[220px] px-3 py-3 text-muted-foreground" title={s.items.map((i) => i.productName).join(", ")}>
                      <span className="line-clamp-2">{preview}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">${s.totalAmount}</td>
                    <td className="px-3 py-3">
                      <OrderStatusSelect orderId={s.id} current={s.status} compact />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/admin/orders/${s.id}`} className="text-xs font-semibold text-primary hover:underline">
                        View
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <InvoicePdfLink orderId={s.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 ? (
              <Link href={`/admin/orders?page=${page - 1}`} className="btn-secondary h-9 px-3 text-xs">
                Previous
              </Link>
            ) : null}
            <span className="px-3 text-xs text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            {page < pagination.totalPages ? (
              <Link href={`/admin/orders?page=${page + 1}`} className="btn-secondary h-9 px-3 text-xs">
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </DashboardShell>
  );
}
