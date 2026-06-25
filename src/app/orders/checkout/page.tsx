import { CheckoutClient } from "@/components/CheckoutClient";
import { getSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    redirect("/login?next=/orders/checkout");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, phone: true, businessName: true },
  });

  const inner = (
    <div className="content-stack">
      <PageHeader
        kicker="Order workflow"
        title="Checkout"
        subtitle="Review cart lines, confirm business details, and place your order."
      />
      <CheckoutClient
        isCustomer
        initialCustomer={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          phone: user?.phone ?? "",
          businessName: user?.businessName ?? "",
        }}
      />
    </div>
  );
  return <DashboardShell role="CUSTOMER">{inner}</DashboardShell>;
}
