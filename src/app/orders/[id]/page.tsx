import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { OrderPlacedBanner } from "@/components/OrderPlacedBanner";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getSession } from "@/lib/auth/get-session";
import { getOrderById } from "@/server/services/order.service";
import { serializeOrder } from "@/server/serialize";
import { redirect, notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    redirect("/login");
  }
  const { id } = await params;
  const sp = await searchParams;
  const showPlaced = sp.placed === "1";
  let order;
  try {
    order = await getOrderById(id, session.sub, false);
  } catch {
    notFound();
  }
  const s = serializeOrder(order);

  return (
    <DashboardShell role="CUSTOMER">
      <Link href="/orders" className="link-muted text-xs">
        ← Dashboard
      </Link>

      <OrderPlacedBanner orderId={id} show={showPlaced} />

      <div className="card-dashboard mt-4 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-kicker">Order detail</p>
            <h1 className="dash-title mt-3">Order reference and line-level pricing.</h1>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{s.id}</p>
            <p className="mt-2 text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
            <div className="mt-4">
              <OrderStatusBadge status={s.status} />
            </div>
          </div>
          <div className="rounded-[20px] border border-border/80 bg-muted/65 p-4 lg:min-w-[16rem]">
            <p className="section-kicker">Total</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">${s.totalAmount}</p>
            <InvoicePdfLink orderId={s.id} variant="button" className="btn-ink mt-4 w-full">
            Invoice PDF
            </InvoicePdfLink>
          </div>
        </div>

        <div className="table-shell mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Size</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Line</th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((i) => (
                <tr key={i.id} className="table-row">
                  <td className="px-4 py-2.5">{i.productName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.size ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{i.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">${i.price}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">${i.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
