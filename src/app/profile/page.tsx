import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { serializeOrderRow } from "@/server/serialize";
import { listMyOrders } from "@/server/services/order.service";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    redirect("/login?next=/profile");
  }

  const { data } = await listMyOrders(session.sub, 1, 5);
  const recent = data.map(serializeOrderRow);
  const totalSpent = recent.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <DashboardShell role="CUSTOMER">
      <div className="content-stack">
        <PageHeader
          kicker="Customer profile"
          title="Profile and order history"
          subtitle={session.email}
          actions={
            <Link href="/" className="btn-primary w-full lg:w-auto">
              Place new order
            </Link>
          }
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="stat-card">
            <p className="stat-label">Recent orders</p>
            <p className="stat-value">{recent.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Recent value</p>
            <p className="stat-value">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Order history</p>
            <Link href="/orders" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
              View full history
            </Link>
          </div>
        </section>

        {recent.length === 0 ? (
          <div className="card-dashboard flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">No orders yet</p>
            <Link href="/" className="btn-primary mt-5">
              Browse catalog
            </Link>
          </div>
        ) : (
          <section className="card-dashboard p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent orders</h2>
              <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recent.map((o) => (
                <article key={o.id} className="rounded-[16px] border border-border/80 bg-muted/30 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">Ref #{o.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={o.status} />
                      <p className="font-semibold tabular-nums">${o.totalAmount}</p>
                      <Link href={`/orders/${o.id}`} className="text-sm font-semibold text-primary hover:underline">
                        Open
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
