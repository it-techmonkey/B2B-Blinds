import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { CartReviewClient } from "@/components/CartReviewClient";
import { getSession } from "@/lib/auth/get-session";

export default async function CartPage() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    redirect("/login?next=/cart");
  }

  return (
    <DashboardShell role="CUSTOMER">
      <div className="content-stack">
        <PageHeader
          kicker="Order workflow"
          title="Cart"
          subtitle="Review products added from catalog, adjust quantities, then continue to checkout."
        />
        <CartReviewClient />
      </div>
    </DashboardShell>
  );
}
