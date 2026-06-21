import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getOrderById } from "@/server/services/order.service";
import { serializeOrder } from "@/server/serialize";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const { id } = await params;
  let order;
  try {
    order = await getOrderById(id, session.sub, true);
  } catch {
    notFound();
  }
  const s = serializeOrder(order);

  return (
    <DashboardShell role="ADMIN">
      <PageHeader
        kicker="Admin operations"
        title={`Order ${s.referenceNumber}`}
        subtitle={`Placed ${new Date(s.createdAt).toLocaleString()}`}
        actions={
          <Link href="/admin/orders" className="btn-secondary w-full lg:w-auto">
            Back to orders
          </Link>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Customer</p>
          <p className="stat-value !text-xl">{s.customerName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.customerBusinessName}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Status</p>
          <div className="mt-2">
            <OrderStatusBadge status={s.status} />
          </div>
          <div className="mt-3">
            <OrderStatusSelect orderId={s.id} current={s.status} compact />
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total</p>
          <p className="stat-value">${s.totalAmount}</p>
          <InvoicePdfLink orderId={s.id} variant="button" className="btn-ink mt-3 h-10 w-full">
            Invoice PDF
          </InvoicePdfLink>
        </div>
      </section>

      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Customer details</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p className="text-muted-foreground">
            Email: <span className="font-medium text-foreground">{s.customerEmail}</span>
          </p>
          <p className="text-muted-foreground">
            Phone: <span className="font-medium text-foreground">{s.customerPhone}</span>
          </p>
          <p className="text-muted-foreground">
            City: <span className="font-medium text-foreground">{s.customerCity}</span>
          </p>
          <p className="text-muted-foreground">
            Customer ID: <span className="font-mono text-xs text-foreground">{s.userId ?? "Guest"}</span>
          </p>
        </div>
        {s.customerNotes ? (
          <div className="mt-4 rounded-[14px] border border-border/80 bg-muted/25 p-3">
            <p className="section-kicker">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{s.customerNotes}</p>
          </div>
        ) : null}
      </section>

      <section className="table-shell overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Size</th>
              <th className="px-4 py-2.5 text-right font-medium">Stock</th>
              <th className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium">Price</th>
              <th className="px-4 py-2.5 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((i) => (
              <tr key={i.id} className="table-row">
                <td className="px-4 py-2.5">{i.productName}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{i.size ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {i.stockOnHand != null ? i.stockOnHand : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{i.quantity}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">${i.price}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">${i.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardShell>
  );
}
