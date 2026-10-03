import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { SavedOrdersClient } from "@/components/SavedOrdersClient";
import { getSession } from "@/lib/auth/get-session";
import { listSavedOrders } from "@/server/services/saved-order.service";

export default async function SavedOrdersPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    redirect("/login?next=/orders/saved");
  }
  const sp = await searchParams;
  const orders = await listSavedOrders(session.sub);

  return (
    <DashboardShell role="CUSTOMER">
      <div className="content-stack">
        <PageHeader
          kicker="Order workflow"
          title="Saved orders"
          subtitle="Orders you saved for later. They are not placed until you check out, and prices are refreshed when you resume."
        />
        <SavedOrdersClient initialOrders={orders} justSaved={sp.saved === "1"} />
      </div>
    </DashboardShell>
  );
}
