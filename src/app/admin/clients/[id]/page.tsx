import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { AdminClientProfileForm } from "@/components/AdminClientProfileForm";
import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const client = await prisma.user.findFirst({
    where: { id, role: UserRole.CUSTOMER },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 10 },
      priceOverrides: true,
    },
  });
  if (!client) notFound();

  return (
    <DashboardShell role="ADMIN">
      <div className="content-stack">
        <PageHeader
          kicker="Admin operations"
          title={client.name}
          subtitle={client.email + " · " + client.orders.length + " recent orders"}
          actions={<Link href="/admin/clients" className="btn-secondary">Back to clients</Link>}
        />

        <AdminClientProfileForm
          clientId={client.id}
          initial={{
            name: client.name,
            businessName: client.businessName,
            phone: client.phone,
            city: client.city,
            postcode: client.postcode,
            invoiceAddress: client.invoiceAddress,
            deliveryAddress: client.deliveryAddress,
          }}
        />

        <section className="card-dashboard p-5 sm:p-6">
          <p className="section-kicker">Client pricing</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Set prices for every product</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Open the client&apos;s pricing editor to set fixed product prices or apply a yearly percentage change.</p>
            </div>
            <Link href="/admin/clients" className="btn-secondary h-9 px-4 text-sm">Open pricing editor</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/45 p-4"><p className="helper-text">Current percentage adjustment</p><p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{client.pricingDiscount?.toFixed(2) ?? "0.00"}%</p></div>
            <div className="rounded-xl border border-border bg-muted/45 p-4"><p className="helper-text">Fixed product prices</p><p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{client.priceOverrides.length}</p></div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
