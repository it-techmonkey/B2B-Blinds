import Link from "next/link";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
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
  const created = data.filter((o) => o.status === "CREATED").length;
  const completed = data.filter((o) => o.status === "COMPLETED").length;

  return (
    <DashboardShell role="ADMIN">
      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="dash-title mt-3">Orders</h1>
          </div>

        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Orders on page</p>
          <p className="stat-value">{data.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Created / completed</p>
          <p className="stat-value">{created} / {completed}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Page GMV</p>
          <p className="stat-value">${totalValue.toFixed(2)}</p>
        </div>
      </section>

      <div className="table-shell overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-3 py-3 font-medium">Order</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Placed</th>
              <th className="px-3 py-3 font-medium">Lines</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Invoice</th>
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
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{s.id}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold leading-tight text-foreground">{s.customerName}</div>
                    <div className="text-xs text-muted-foreground">{s.customerBusinessName}</div>
                    <div className="text-xs text-muted-foreground">{s.customerEmail}</div>
                    <div className="text-xs text-muted-foreground">{s.customerPhone}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-muted-foreground" title={s.items.map((i) => i.productName).join(", ")}>
                    <span className="line-clamp-2">{preview}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">${s.totalAmount}</td>
                  <td className="px-3 py-3">
                    <OrderStatusSelect orderId={s.id} current={s.status} compact />
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

      {pagination.totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pagination">
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
    </DashboardShell>
  );
}
