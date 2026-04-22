import { CatalogCart } from "@/components/CatalogCart";
import { DashboardShell } from "@/components/DashboardShell";
import { GuestShell } from "@/components/GuestShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";

export async function CatalogShopPage() {
  const session = await getSession();
  const isCustomer = session?.role === "CUSTOMER";

  const inner = (
    <>
      <PageHeader
        kicker="Product catalog"
        title="Catalog"
        subtitle="Browse variants, build your cart, and move to checkout when quantities are ready."
      />
      <CatalogCart isCustomer={isCustomer} />
    </>
  );

  if (isCustomer) {
    return <DashboardShell role="CUSTOMER">{inner}</DashboardShell>;
  }
  return <GuestShell>{inner}</GuestShell>;
}
