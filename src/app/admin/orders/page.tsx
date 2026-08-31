import Link from "next/link";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { PaymentStatusSelect } from "@/components/PaymentStatusSelect";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listAllOrders } from "@/server/services/order.service";
import { serializeOrder } from "@/server/serialize";
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

type SortField = "name" | "number" | "time" | "items" | "total";
type SortDirection = "asc" | "desc";
function isSortField(value: string | undefined): value is SortField { return value === "name" || value === "number" || value === "time" || value === "items" || value === "total"; }
function SortHeader({ field, label, activeField, direction }: { field: SortField; label: string; activeField: SortField; direction: SortDirection }) {
  const active = field === activeField;
  const next: SortDirection = active && direction === "asc" ? "desc" : "asc";
  return <Link href={`/admin/orders?sort=${field}&direction=${next}`} className="inline-flex items-center gap-1 font-medium hover:text-foreground">{label}<span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></Link>;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; direction?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = isSortField(sp.sort) ? sp.sort : "time";
  const direction: SortDirection = sp.direction === "asc" ? "asc" : "desc";
  const { data, pagination } = await listAllOrders(page, 20);

  const liveOrders = data.filter((o) => !o.creditNote);
  const totalValue = liveOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const openOrders = liveOrders.filter((o) => o.status !== "DELIVERED").length;
  const completed = liveOrders.filter((o) => o.status === "DELIVERED").length;

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
        ) : (() => {
          const rows = data.map(serializeOrder).sort((a, b) => {
            const left = sort === "name" ? a.customerName : sort === "number" ? a.orderNumber : sort === "items" ? a.items.length : sort === "total" ? Number(a.totalAmount) : new Date(a.createdAt).getTime();
            const right = sort === "name" ? b.customerName : sort === "number" ? b.orderNumber : sort === "items" ? b.items.length : sort === "total" ? Number(b.totalAmount) : new Date(b.createdAt).getTime();
            const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
            return direction === "asc" ? comparison : -comparison;
          });
          const groupsByLabel = new Map<string, typeof rows>();
          for (const o of rows) {
            const label = dateLabel(o.createdAt);
            const group = groupsByLabel.get(label);
            if (group) group.push(o); else groupsByLabel.set(label, [o]);
          }
          const groups = Array.from(groupsByLabel, ([label, orders]) => ({ label, orders }));
          return (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</p>
                  <div className="table-shell overflow-x-auto">
                    <table className="w-full min-w-270 text-sm">
                      <thead>
                        <tr className="table-head">
                          <th className="px-3 py-3"><SortHeader field="name" label="Name" activeField={sort} direction={direction} /></th>
                          <th className="px-3 py-3"><SortHeader field="number" label="Order #" activeField={sort} direction={direction} /></th>
                          <th className="px-3 py-3 font-medium">Your Ref</th>
                          <th className="px-3 py-3"><SortHeader field="time" label="Time" activeField={sort} direction={direction} /></th>
                          <th className="px-3 py-3"><SortHeader field="items" label="Items" activeField={sort} direction={direction} /></th>
                          <th className="px-3 py-3 text-right"><SortHeader field="total" label="Total" activeField={sort} direction={direction} /></th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Payment</th>
                          <th className="px-3 py-3 text-right font-medium">View</th>
                          <th className="px-3 py-3 text-right font-medium">PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders.map((s) => {
                          const preview =
                            s.items.length <= 2
                              ? s.items.map((i) => i.productName).join(", ")
                              : `${s.items[0]?.productName ?? ""} +${s.items.length - 1}`;
                          return (
                            <tr key={s.id} className="table-row">
                              <td className="px-3 py-3 font-semibold text-foreground">{s.customerName}</td>
                              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                                <Link href={`/admin/orders/${s.id}`} className="hover:text-foreground hover:underline">
                                  {s.orderNumber}
                                </Link>
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">{s.customerReference ?? "—"}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                                {new Date(s.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="max-w-[220px] px-3 py-3 text-muted-foreground" title={s.items.map((i) => i.productName).join(", ")}>
                                <span className="line-clamp-2">{preview}</span>
                              </td>
                              <td className="px-3 py-3 text-right font-semibold tabular-nums">{s.creditNote ? <span className="text-destructive">Credited</span> : `$${s.totalAmount}`}</td>
                              <td className="px-3 py-3">
                                {s.creditNote ? <span className="badge badge-neutral">Credited</span> : <OrderStatusSelect orderId={s.id} current={s.status} compact />}
                              </td>
                              <td className="px-3 py-3">
                                {s.creditNote ? <span className="text-xs text-muted-foreground">Reversed</span> : <PaymentStatusSelect orderId={s.id} current={s.paymentStatus} compact />}
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
                </div>
              ))}
            </div>
          );
        })()}

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
