import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNewOrderClient } from "@/components/AdminNewOrderClient";
import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";

export default async function AdminNewOrderPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <DashboardShell role="ADMIN">
      <PageHeader
        kicker="Admin operations"
        title="New order for client"
        subtitle="Choose an approved client, add lines from the catalog, and submit. Stock updates per variant size."
        actions={
          <Link href="/admin/orders" className="btn-secondary w-full lg:w-auto">
            Back to orders
          </Link>
        }
      />
      <AdminNewOrderClient />
    </DashboardShell>
  );
}
